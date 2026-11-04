# 📋 INSTRUCCIÓN DE AGENTE: GENERADOR DE MATERIA PRIMA PARA GUIONES (GEMINI PROMPT)

## 🎯 PROPÓSITO

Tu único objetivo cuando se invoque esta guía es actuar como un Analista Técnico de Comunicación. Debes escanear el repositorio o los últimos cambios realizados y generar un archivo Markdown optimizado para ser procesado por una IA de redacción creativa (como Gemini o ChatGPT). No debes escribir código, solo analizarlo y explicarlo narrativamente.

## 📝 FORMATO DE SALIDA COMPULSORIO

Debes crear o sobreescribir un archivo en la raíz llamado `PROMPT_PARA_GEMINI.md`. El contenido de este archivo debe seguir estrictamente la siguiente estructura:

---

### [INICIO DEL TEXTO PARA COPIAR]

# Contexto de Desarrollo para Guión de Video

## 1. El Problema Original (El "Dolor")

- [Describe en 2 oraciones sencillas qué estaba fallando, qué bug existía o qué funcionalidad le faltaba al proyecto antes de los cambios].
- [Explica por qué esto arruinaba la experiencia del usuario o del desarrollador].

## 2. La Solución Técnica (La Magia)

- [Explica en lenguaje humano y directo qué archivos se modificaron y qué lógica nueva se introdujo].
- [Usa una analogía simple de la vida real para explicar cómo funciona esta nueva solución (Ej: "Es como poner un portero en la discoteca que revisa las identificaciones antes de entrar")].

## 3. El Impacto (El Resultado)

- [Qué pasa ahora que el código funciona. Qué beneficio inmediato tiene].

## 4. Extractos Clave de Código (Materia Prima)

- [Inserta aquí SOLO las líneas o bloques de código más visuales o importantes que demuestren el cambio. Evita configuraciones repetitivas o imports. Máximo 2 bloques de código limpios].

---

### [FIN DEL TEXTO PARA COPIAR]

## 🚫 REGLAS DE ORO PARA EL AGENTE (OPENCODE)

1. **Cero Tecnicismos Excesivos:** Evita usar términos ultra-complejos que una audiencia general de videos no entendería. Transforma "Inyección de dependencias desacoplada" en "Organizamos el código para que sea más fácil de mantener".
2. **Enfoque Narrativo:** Concéntrate en el "Antes" y el "Después" del código. Las historias de video se basan en resolver conflictos.
3. **No ejecutes cambios:** Mantén esta operación estrictamente en modo de lectura del repositorio y escritura del archivo `PROMPT_PARA_GEMINI.md`.

<br>

"Lee el archivo `.opencode/guion_raw_template.md` y ejecuta la instrucción para generar mi materia prima de video."
