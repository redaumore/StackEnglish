# **Feature Canvas: Oral Tech Paraphrase con SRS**

## **1\. Problem & Vision**

* **Target Audience:** Desarrolladores de software hispanohablantes en transición del nivel B1 hacia B2.  
* **Problema:** Dificultad para parafrasear y explicar conceptos técnicos fluidamente en inglés oral durante ceremonias ágiles, revisiones de código y llamadas sincrónicas, dependiendo en exceso de traducciones literales o repitiendo mecánicamente las palabras de la consigna/ticket.  
* **Solución:** Módulo interactivo de práctica oral con tarjetas técnicas, captura de voz con transcripción Speech-to-Text (STT), evaluación pedagógica ponderada mediante LLM sin rigor de nativo, y retención a largo plazo gobernada por un algoritmo de repetición espaciada (SRS estilo SM-2 de Anki).

## **2\. User Flow & State Machine**

\[Mazo de Tarjetas Pendientes (nextReviewDate \<= now)\]  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\[Estado 1: IDLE\]  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Muestra sourcePhrase  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Muestra chips de forbiddenWords  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Botón de micrófono listo  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (Click en "Grabar")  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\[Estado 2: RECORDING\]  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Captura con MediaRecorder  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Timer en vivo (telemetría de alocución)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Detección de silencio o click "Detener"  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (Detener)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\[Estado 3: PROCESSING\]  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- STT (Whisper API / Web Speech) \-\> userTranscript  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Invocación LLM (Evaluador Pedagógico)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Ejecución de algoritmo SM-2 con overallScore  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (Respuesta lista)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\[Estado 4: FEEDBACK\]  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Score general (1.0 a 5.0) y badge de nivel  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Badge de telemetría de ritmo (segundos)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Badge SRS (ej. "Próxima revisión: en 4 días")  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Comparación: You said vs Model answer  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Quick Insights (Significado, Vocabulario, Gramática)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\- Polished Sentence con botón de reproducción TTS  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (Click en "Siguiente")  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\[Actualización DB & Siguiente Tarjeta\]

## **3\. Data Schemas & TypeScript Contracts**

### **3.1. Entidad de Base de Datos / Tarjeta (TechCard)**

export interface TechCard {  
&nbsp;&nbsp;id: string;  
&nbsp;&nbsp;sourcePhrase: string;          // Ej: "Address PR feedback"  
&nbsp;&nbsp;modelAnswer: string;           // Ej: "To make requested code changes and reply to reviewer comments"  
&nbsp;&nbsp;forbiddenWords: string\[\];      // Lemas que no debe decir: \["address", "pr", "feedback"\]  
&nbsp;&nbsp;contextDomain: "git" | "architecture" | "agile" | "debugging" | "ci\_cd";  
&nbsp;&nbsp;// Propiedades del algoritmo SRS SM-2  
&nbsp;&nbsp;repetition: number;            // Cantidad de repasos consecutivos exitosos  
&nbsp;&nbsp;intervalDays: number;          // Intervalo actual en días (0 \= mismo día)  
&nbsp;&nbsp;easeFactor: number;            // Factor de facilidad SM-2 (default: 2.5, min: 1.3)  
&nbsp;&nbsp;nextReviewDate: string;        // ISO 8601 string UTC  
&nbsp;&nbsp;createdAt: string;  
&nbsp;&nbsp;updatedAt: string;  
}

### **3.2. Payload de Solicitud de Evaluación (EvaluationRequest)**

export interface EvaluationRequest {  
&nbsp;&nbsp;cardId: string;  
&nbsp;&nbsp;sourcePhrase: string;  
&nbsp;&nbsp;modelAnswer: string;  
&nbsp;&nbsp;forbiddenWords: string\[\];  
&nbsp;&nbsp;userTranscript: string;  
&nbsp;&nbsp;speechDurationSeconds: number;  
}

### **3.3. Contrato de Respuesta del Evaluador (EvaluationResult)**

export interface EvaluationResult {  
&nbsp;&nbsp;cardId: string;  
&nbsp;&nbsp;scores: {  
&nbsp;&nbsp;&nbsp;&nbsp;semanticEquivalence: number; // 1.0 \- 5.0 (Ponderación: 40%)  
&nbsp;&nbsp;&nbsp;&nbsp;lexicalCompliance: number;   // 1.0 \- 5.0 (Ponderación: 20%)  
&nbsp;&nbsp;&nbsp;&nbsp;grammarAndSyntax: number;    // 1.0 \- 5.0 (Ponderación: 25%)  
&nbsp;&nbsp;&nbsp;&nbsp;vocabularyRange: number;     // 1.0 \- 5.0 (Ponderación: 15%)  
&nbsp;&nbsp;&nbsp;&nbsp;overallScore: number;        // Promedio ponderado final  
&nbsp;&nbsp;};  
&nbsp;&nbsp;telemetry: {  
&nbsp;&nbsp;&nbsp;&nbsp;durationSeconds: number;  
&nbsp;&nbsp;&nbsp;&nbsp;paceCategory: "fast" | "thoughtful" | "extended";  
&nbsp;&nbsp;};  
&nbsp;&nbsp;insights: {  
&nbsp;&nbsp;&nbsp;&nbsp;meaningSummary: string;       // 1 línea descriptiva del logro semántico  
&nbsp;&nbsp;&nbsp;&nbsp;repeatedForbiddenWords: string\[\]; // Palabras prohibidas detectadas (vacío si cumple)  
&nbsp;&nbsp;&nbsp;&nbsp;grammarBullets: string\[\];     // Máximo 2 correcciones atómicas directas  
&nbsp;&nbsp;&nbsp;&nbsp;polishedSentence: string;    // Frase dicha por el usuario pulida y corregida  
&nbsp;&nbsp;};  
&nbsp;&nbsp;srsUpdate: {  
&nbsp;&nbsp;&nbsp;&nbsp;rating: "again" | "hard" | "good" | "easy";  
&nbsp;&nbsp;&nbsp;&nbsp;newIntervalDays: number;  
&nbsp;&nbsp;&nbsp;&nbsp;newEaseFactor: number;  
&nbsp;&nbsp;&nbsp;&nbsp;nextReviewDate: string;      // ISO 8601 calculado  
&nbsp;&nbsp;};  
}

## **4\. Lógica del Motor SRS (Algoritmo SM-2 Adaptado)**

La función toma el overallScore (1.0 a 5.0) y proyecta el resultado a las 4 clasificaciones tradicionales de Anki:

export interface SM2State {  
&nbsp;&nbsp;intervalDays: number;  
&nbsp;&nbsp;easeFactor: number;  
&nbsp;&nbsp;repetition: number;  
}

export interface SM2Output {  
&nbsp;&nbsp;rating: "again" | "hard" | "good" | "easy";  
&nbsp;&nbsp;newIntervalDays: number;  
&nbsp;&nbsp;newEaseFactor: number;  
&nbsp;&nbsp;newRepetition: number;  
&nbsp;&nbsp;nextReviewDate: string;  
}

export function computeSM2(score: number, state: SM2State, currentDate \= new Date()): SM2Output {  
&nbsp;&nbsp;let rating: "again" | "hard" | "good" | "easy";  
&nbsp;&nbsp;let newInterval \= 0;  
&nbsp;&nbsp;let newRepetition \= state.repetition;  
&nbsp;&nbsp;let newEaseFactor \= state.easeFactor;

&nbsp;&nbsp;if (score \< 3.0) {  
&nbsp;&nbsp;&nbsp;&nbsp;rating \= "again";  
&nbsp;&nbsp;&nbsp;&nbsp;newRepetition \= 0;  
&nbsp;&nbsp;&nbsp;&nbsp;newInterval \= 0; // Repasar en la misma sesión / 10 minutos  
&nbsp;&nbsp;&nbsp;&nbsp;newEaseFactor \= Math.max(1.3, state.easeFactor \- 0.20);  
&nbsp;&nbsp;} else if (score \< 4.0) {  
&nbsp;&nbsp;&nbsp;&nbsp;rating \= "hard";  
&nbsp;&nbsp;&nbsp;&nbsp;newRepetition \= state.repetition \+ 1;  
&nbsp;&nbsp;&nbsp;&nbsp;newInterval \= state.intervalDays \=== 0 ? 1 : Math.round(state.intervalDays \* 1.2);  
&nbsp;&nbsp;&nbsp;&nbsp;newEaseFactor \= Math.max(1.3, state.easeFactor \- 0.15);  
&nbsp;&nbsp;} else if (score \<= 4.7) {  
&nbsp;&nbsp;&nbsp;&nbsp;rating \= "good";  
&nbsp;&nbsp;&nbsp;&nbsp;newRepetition \= state.repetition \+ 1;  
&nbsp;&nbsp;&nbsp;&nbsp;if (newRepetition \=== 1\) {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;newInterval \= 1;  
&nbsp;&nbsp;&nbsp;&nbsp;} else if (newRepetition \=== 2\) {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;newInterval \= 4;  
&nbsp;&nbsp;&nbsp;&nbsp;} else {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;newInterval \= Math.round(state.intervalDays \* state.easeFactor);  
&nbsp;&nbsp;&nbsp;&nbsp;}  
&nbsp;&nbsp;} else {  
&nbsp;&nbsp;&nbsp;&nbsp;rating \= "easy";  
&nbsp;&nbsp;&nbsp;&nbsp;newRepetition \= state.repetition \+ 1;  
&nbsp;&nbsp;&nbsp;&nbsp;if (newRepetition \=== 1\) {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;newInterval \= 3;  
&nbsp;&nbsp;&nbsp;&nbsp;} else if (newRepetition \=== 2\) {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;newInterval \= 7;  
&nbsp;&nbsp;&nbsp;&nbsp;} else {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;newInterval \= Math.round(state.intervalDays \* state.easeFactor \* 1.3);  
&nbsp;&nbsp;&nbsp;&nbsp;}  
&nbsp;&nbsp;&nbsp;&nbsp;newEaseFactor \= state.easeFactor \+ 0.15;  
&nbsp;&nbsp;}

&nbsp;&nbsp;const reviewDate \= new Date(currentDate);  
&nbsp;&nbsp;if (newInterval \=== 0\) {  
&nbsp;&nbsp;&nbsp;&nbsp;reviewDate.setMinutes(reviewDate.getMinutes() \+ 10);  
&nbsp;&nbsp;} else {  
&nbsp;&nbsp;&nbsp;&nbsp;reviewDate.setDate(reviewDate.getDate() \+ newInterval);  
&nbsp;&nbsp;}

&nbsp;&nbsp;return {  
&nbsp;&nbsp;&nbsp;&nbsp;rating,  
&nbsp;&nbsp;&nbsp;&nbsp;newIntervalDays: newInterval,  
&nbsp;&nbsp;&nbsp;&nbsp;newEaseFactor: Number(newEaseFactor.toFixed(2)),  
&nbsp;&nbsp;&nbsp;&nbsp;newRepetition,  
&nbsp;&nbsp;&nbsp;&nbsp;nextReviewDate: reviewDate.toISOString(),  
&nbsp;&nbsp;};  
}

## **5\. System Prompt para el Servicio LLM Evaluador**

Eres un evaluador pedagógico experto en inglés técnico para ingenieros de software en transición del nivel B1 al B2.

Tu misión es calificar la transcripción de una respuesta oral brindada por el usuario al intentar parafrasear un modismo o consigna de desarrollo de software.  
No evalúes con severidad de hablante nativo; prioriza que la intención técnica sea comprensible y funcional. Sé tolerante con errores menores introducidos por el Speech-to-Text (STT).

PARAMETROS DE ENTRADA:  
\- source\_phrase: Consigna base que el usuario debía explicar.  
\- model\_answer: Respuesta modelo esperada.  
\- forbidden\_words: Array de términos o raíces prohibidas que el usuario no debía pronunciar.  
\- user\_transcript: Transcripción del audio del usuario.  
\- speech\_duration\_seconds: Duración de la alocución en segundos.

DIMENSIONES DE EVALUACION (Escala 1.0 a 5.0):  
1\. semanticEquivalence (Peso 40%): ¿Comunica con claridad la acción, el alcance y el objetivo técnico de la frase modelo?  
2\. lexicalCompliance (Peso 20%): Asigna 5.0 si NO empleó ninguna de las palabras en forbidden\_words (ni sus variantes directas). Si empleó una o más, califica severamente (1.0 a 2.5) y regístralas en repeatedForbiddenWords.  
3\. grammarAndSyntax (Peso 25%): Evalúa concordancia, tiempos verbales, preposiciones de interfaz ("on the screen", no "in"), régimen verbal ("respond to") y falsos cognados de ortografía ("strange", no "extrange").  
4\. vocabularyRange (Peso 15%): Empleo de vocabulario técnico contextual adecuado (peers, review, patch, issue) en lugar de muletillas simplistas.

REGLAS PARA LOS CAMPOS DE SALIDA:  
\- overallScore: Cálculo ponderado: (semanticEquivalence \* 0.40) \+ (lexicalCompliance \* 0.20) \+ (grammarAndSyntax \* 0.25) \+ (vocabularyRange \* 0.15).  
\- polishedSentence: Corrige la frase expresada por el usuario manteniendo sus propias palabras y estructura original en la medida de lo posible, resolviendo únicamente sus fallas gramaticales y preposicionales.  
\- grammarBullets: Retorna máximo 2 observaciones atómicas, concisas y directas (ej: "Usá 'on the screen' (no 'in')", "Decí 'a strange' sin 'e' inicial").  
\- paceCategory: "fast" si speech\_duration\_seconds \< 8, "thoughtful" si está entre 8 y 18, "extended" si supera 18\.

FORMATO DE RESPUESTA:  
Debes responder ESTRICTAMENTE en formato JSON válido, sin bloques de markdown adicionales ni texto fuera del esquema definido.

## **6\. Especificación de UI/UX y Componentes**

### **6.1. Pantalla de Práctica (Modo Grabación)**

* **Tarjeta Central:**  
  * sourcePhrase destacada en encabezado H2 (22-24px, Semi-bold).  
  * Contenedor de forbiddenWords con chips visuales (borde rojo sutil, icono de prohibido).  
* **Control de Voz:**  
  * Botón flotante central con icono de micrófono.  
  * Al presionar: estado visual con ondas de pulso (pulse animation), cronómetro incremental (00:00).  
  * Opción de corte manual (Detener) o auto-stop tras 3 segundos de silencio.

### **6.2. Pantalla de Feedback (\<15 segundos de lectura)**

* **Top Header Bar:**  
  * Pill de puntuación: ⭐ 4.2 / 5.0 (Verde: ![][image1], Amarillo: ![][image2], Rojo: ![][image3]).  
  * Pill de fluidez: ⚡ Pace: 7.2s.  
  * Pill SRS: 📅 Próximo repaso: en 4 días (Good).  
* **Bloque Comparativo:**  
  * **You said:** Transcripción de su audio. Si violó palabras de forbiddenWords, se muestran con tachado y color rojo.  
  * **Model answer:** Frase de referencia en tono atenuado (muted text).  
* **Quick Insights (3 filas atómicas):**  
  * ✔️ **Significado:** Breve confirmación del acierto conceptual.  
  * 🏷️ **Vocabulario:** Estatus de la restricción de no repetición.  
  * 🛠️ **Gramática:** 1 o 2 viñetas directas de ajuste sintáctico.  
* **Acción & Repaso Inmediato:**  
  * Tarjeta destacada con la polishedSentence.  
  * Botón de audio: \[ Escuchar corrección 🔊 \] que ejecuta Text-to-Speech nativo (speechSynthesis).  
  * CTA Principal: \[ Siguiente ejercicio ➔ \] que persiste la tarjeta actualizada y despacha la siguiente en cola.

## **7\. Muestra de Datos de Semilla (Seed Cards)**

\[  
&nbsp;&nbsp;{  
&nbsp;&nbsp;&nbsp;&nbsp;"id": "card\_001",  
&nbsp;&nbsp;&nbsp;&nbsp;"sourcePhrase": "Address PR feedback",  
&nbsp;&nbsp;&nbsp;&nbsp;"modelAnswer": "To make requested code changes and reply to reviewer comments",  
&nbsp;&nbsp;&nbsp;&nbsp;"forbiddenWords": \["address", "pr", "feedback"\],  
&nbsp;&nbsp;&nbsp;&nbsp;"contextDomain": "git",  
&nbsp;&nbsp;&nbsp;&nbsp;"repetition": 0,  
&nbsp;&nbsp;&nbsp;&nbsp;"intervalDays": 0,  
&nbsp;&nbsp;&nbsp;&nbsp;"easeFactor": 2.5,  
&nbsp;&nbsp;&nbsp;&nbsp;"nextReviewDate": "2026-09-15T00:00:00Z"  
&nbsp;&nbsp;},  
&nbsp;&nbsp;{  
&nbsp;&nbsp;&nbsp;&nbsp;"id": "card\_002",  
&nbsp;&nbsp;&nbsp;&nbsp;"sourcePhrase": "Pair program on a tricky bug",  
&nbsp;&nbsp;&nbsp;&nbsp;"modelAnswer": "To collaborate synchronously with another engineer on the same screen to debug complex code",  
&nbsp;&nbsp;&nbsp;&nbsp;"forbiddenWords": \["pair", "program", "tricky", "bug"\],  
&nbsp;&nbsp;&nbsp;&nbsp;"contextDomain": "debugging",  
&nbsp;&nbsp;&nbsp;&nbsp;"repetition": 0,  
&nbsp;&nbsp;&nbsp;&nbsp;"intervalDays": 0,  
&nbsp;&nbsp;&nbsp;&nbsp;"easeFactor": 2.5,  
&nbsp;&nbsp;&nbsp;&nbsp;"nextReviewDate": "2026-09-15T00:00:00Z"  
&nbsp;&nbsp;},  
&nbsp;&nbsp;{  
&nbsp;&nbsp;&nbsp;&nbsp;"id": "card\_003",  
&nbsp;&nbsp;&nbsp;&nbsp;"sourcePhrase": "Put up a pull request for review",  
&nbsp;&nbsp;&nbsp;&nbsp;"modelAnswer": "To open a PR and request peer code critique and approvals",  
&nbsp;&nbsp;&nbsp;&nbsp;"forbiddenWords": \["put", "pull", "request", "review"\],  
&nbsp;&nbsp;&nbsp;&nbsp;"contextDomain": "git",  
&nbsp;&nbsp;&nbsp;&nbsp;"repetition": 0,  
&nbsp;&nbsp;&nbsp;&nbsp;"intervalDays": 0,  
&nbsp;&nbsp;&nbsp;&nbsp;"easeFactor": 2.5,  
&nbsp;&nbsp;&nbsp;&nbsp;"nextReviewDate": "2026-09-15T00:00:00Z"  
&nbsp;&nbsp;},  
&nbsp;&nbsp;{  
&nbsp;&nbsp;&nbsp;&nbsp;"id": "card\_004",  
&nbsp;&nbsp;&nbsp;&nbsp;"sourcePhrase": "Roll back the breaking deployment",  
&nbsp;&nbsp;&nbsp;&nbsp;"modelAnswer": "To revert the production release to the previous stable release because of critical failures",  
&nbsp;&nbsp;&nbsp;&nbsp;"forbiddenWords": \["roll", "back", "breaking", "deployment"\],  
&nbsp;&nbsp;&nbsp;&nbsp;"contextDomain": "ci\_cd",  
&nbsp;&nbsp;&nbsp;&nbsp;"repetition": 0,  
&nbsp;&nbsp;&nbsp;&nbsp;"intervalDays": 0,  
&nbsp;&nbsp;&nbsp;&nbsp;"easeFactor": 2.5,  
&nbsp;&nbsp;&nbsp;&nbsp;"nextReviewDate": "2026-09-15T00:00:00Z"  
&nbsp;&nbsp;}  
\]  


[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAZCAYAAAB3oa15AAACM0lEQVR4Xu2WzUtUURjGJzX7oFooAzHfM0wNDn3JUJuQNm6idqkLKyNauXAputBF6CLatCjaKBT0gfYPCOKyrQupIGgVLZIUXAi27fc058r1daZ7/cAcuA/8ONz3fc55z3vmzpmJxSJFinRgymazHTYWoGYbqKlMJnNP5PP5Sza3H2Lt64IGftlcLeHrhAV4Di8Ee7tsfZsqlUqnBUVG4HU6ne6ynt0ql8sdZwOfHas271e5XG4V+H4WCoXziqVSqYuC2PdEInHSzvmrhm/AL8wnaGKICe8dN61nJ2L+BDx1/LMB6vYJfMs2R2yN3G0bryvfaTziFGcZ7xA+4gglClaYN854XwQ1QJ0nAt8nmyP2TYdh42HVzOR++Ch4xS5Yg1+VSuWowPtWhxC2AfLTjsUauS/w0sbDqIniPTDD6TwUxFqsyS88o4Kb45qed9DAG0e9BqZsPIwasoEWCg44ZqCPWJM11RKXwDk2/0FQsJPxCuOYY03PxWLxjJ0nUeeZwLdkc8S+6vth41vEwscwDWJ+B7eE9QSJDZRZ47FhXrDehp69K9JKtV39HzZHbCVX/fS3i+RdQfFXmG7Y/F7F2sOOba8Q9Wa9jfHpJQW+34xtLn9WKMYBx7fOdorH46eEje+HdCj6+B3rMMctdjVW/Z+j220Jxv1z2PCDbPWvhG4+jaL+71HDN3AYlUwm22m+W69N3VfHE8ZeQZeTYdBNY9f4r/JeIa/bIGIBvwORIkU6OP0BG+3DtP0MVr8AAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAZCAYAAACfIRhSAAADU0lEQVR4Xu2XTWxMURTHO22I+AjBKDPt3Gk7MnRDVSysfH9EREIi0TQWLEgkJEJiJVIRJVKLRix8RGspkWi7IjTY1EKorwUbCdGEjQUlROr/9+6p45i2M01mLNx/8su8+7/nvHvfeffd96asLCgoKOg/UmNj4wTrFaAKa/wDcQ4xa+apioKuv6amJktSqdR559wF0JtOp3cQG2uFmMUEObdAOzgHlhAbW0xh7vsJ5tKBsTtBdzabnUZsrFZ9ff1E5B0gPvcaaLFxOYWEGwQJ+9jG727wzbPcxos4KPoHCPIX0MPxQvCGxOPxqTanGMJYDeAFSSQSs2GV4/g16CE2Xgv9Z0A3UV4vCtlMdOxfCoUbZ+EQeNvT7turwJBnq40X4cTb0f+eaF88sE37xRK2mXUY6x2pqqrK0MONvAeeEBuvxAIPghYipouKeZXo4DHlE2UlTbL9IhTuJGKeE+07f/eRe0r7pVJdXd0cjP9Z9i7bL+LqRNwQ5nmEiI+co/CfEh0/opCwGifoAi/BXGJjtHDii+ARMf5jzyXtl0IYs403HBy0fTkUQ9xHcJyI6V+S38loC0crhsAZXEm+gF2ZTCZug0QuenuNWDjkd2hfKca7nQ+1tbXTiT3BSOK+i0d3EcbvB03ExmixwLjeBwTNCl4/vFfOb1WYw2Sbk0uhcOMs3C9VVlZOQdIPwiLafhH6zroce4F4oE37omQyOQt9J/Ih5b/P7DnGEgrQ6qKNf5DFsP1a6N9DENuJ32OcN/hAbOyw8Baa76K7048JrhUf7U+ePh2vhUH2Ov8207547Nd+sYSxTqf9J5XyDjm/auBv0PFauP6ZiJlHxMNxJ2pxhajQP4Wglc5vhM5/euDRSKlBW+lhgKTzny3V1dVL6eE3gfZXwseKHn/R/uIZnkwxhQu8i7EeEvFwfFnmJisOx4e58RMVx+3mPmHbPw0DfNyJxOUUi+OXdo9fsvz7dJ2k/VuFf8nQfkvgrZdcTGIncVFRm9B3E+3N5PcIxRW/3TB2H+HW4qLVxrluJBLnor+Dd4h4mO8WWa3wd4FnYJP0j6pQuHEWTsRlioHXyGNXiLhXMJcfn7avRConuOgG3ORlvp2X+OVAULwVslCCgoKCgoKCSqWfud1nIVl9QbAAAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAZCAYAAAB3oa15AAACPUlEQVR4Xu2WPWhTURiGq0HBn0GUmJK/e/NjLQGrJYPo4qCL4CBSHFzEwUEEQQcXLRRKUaTgoDhYBbGLruIiOEiHbhaKFApOtkMFB91EFPR5k3Ph9PMmpqEGAveFh8t5v/f8Xe45ycBAokSJ/qvq9fo2621AKWv0ROl0ercIguAePIXXolgs3rHZOJEdhbfwAB6KUql02Oa6kd5IKp/P77AFX0x4Q7DgF2qHYTgs8H7jXbP5SLVabbsgt1Yul4fkMdchgfcpm83utH02qv7cgDpqYngmGPCAzfhisROCSRfUVn9B+xdM23wkxj4vyHy2Nbyv1M5Yv6VYwB5Bx1taNM/jNtOpGOesYIwfPI/YeiRqdwW5D7aG9xEmrf+XKpXKfoJT8ES0m/Bfom8YNA/xN0HzqM34iuaE9zG1JXhk/YZyuVxeEJhWiBN/0Ga6lfv8ok9jod0LoT7raLWBGes31PcboHBVMPirzbpv46SFwTvrR2KT9wWZRVvDW9b5sP46hc1De9sd2mPCZjpQSosUjHPTL9B+g/9TV6XvR2L+K4LMqq3hfaF2yfqxymQyuwhfF3R8zsQnbaaV3HX53bHuymScFcac8z3aL6OFcT3nhPry3Ovqg0JetVpN+307kt4WE19mgFndw+4u3mJzvsiec8y7l/DYscgPVNHFGj+K8mDc70+fi0Hzr8QF9xSn/UzH6vsNeNrK4scEB33EFuOkvxws5kShUKgIW28nbsV9zHVKn01Xn06iRIkS9UR/AAvWtaWJT9u/AAAAAElFTkSuQmCC>