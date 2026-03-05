# Prompt para nodo AI Extract (HappyRobot)

## Configuración del nodo

- **Input**: `@voice_agent.transcript`
- **Model**: GPT-4.1 (o GPT-4.1-mini si la latencia es problema)
- **Mode**: JSON Schema

### JSON Schema (output)

```json
{
  "type": "object",
  "properties": {
    "campos": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "uid": { "type": "string" },
          "value": { "type": "string" }
        },
        "required": ["uid", "value"],
        "additionalProperties": false
      }
    }
  },
  "required": ["campos"],
  "additionalProperties": false
}
```

### Prompt

```
Eres un extractor de datos para formularios de incidencias de seguridad de Prosegur.

## Tu tarea

Analiza el transcript de la conversación entre un vigilante de seguridad y un asistente de IA. En el transcript encontrarás:

1. La respuesta de la herramienta "consultar_estado_formulario" — un JSON con la definición completa del formulario: campos con UIDs, tipos, opciones disponibles y condiciones de bifurcación
2. Los mensajes del vigilante narrando lo ocurrido y respondiendo preguntas

Tu trabajo es extraer TODA la información relevante del vigilante y mapearla a los UIDs del formulario. Devuelve un array de objetos {uid, value} con los campos que hayas podido rellenar.

## Fecha actual

La fecha y hora actual es: @now.iso

Cuando el vigilante diga "hoy", "esta mañana", "hace un rato", usa esta fecha. NUNCA uses fechas de años anteriores.

## Reglas de mapeo por tipo de campo

- `datetime` → Formato ISO 8601: YYYY-MM-DDTHH:mm:ss (ej: "2026-03-02T11:00:00")
- `dropdown` → Texto EXACTO de una de las opciones listadas en el campo. No parafrasees ni resumas — copia la opción tal cual
- `boolean` → Texto EXACTO de la opción (ej: "Sí", "No", "No, sin información")
- `text` → Texto libre tal cual lo dijo el vigilante
- `number` → Solo el número como string (ej: "200", "50")
- Campos con `multiple: true` → Valores separados por " | " (ej: "Policía Nacional | Policía Local")

## Bifurcaciones (campos condicionales) — CRÍTICO

La definición del formulario incluye TODOS los campos posibles, incluidos los condicionales. Identifícalos por:

### Opciones con `opens`
Algunas opciones son objetos con `{"value": "Sí", "opens": ["uid-A", "uid-B"]}`. El array `opens` lista los UIDs de campos hijos que se activan al elegir esa opción.

### Campos con `condition`
Los campos condicionales tienen `"condition": {"field": "uid-padre", "equals": "valor"}`. Esto significa que ese campo SOLO se debe incluir si el campo padre tiene el valor indicado.

### UIDs compuestos
Los campos de bifurcación tienen UIDs compuestos que concatenan los GUIDs de la cadena: `"guid-padre-guid-hijo"` o `"guid-abuelo-guid-padre-guid-hijo"` (hasta 3 niveles). Usa siempre el UID COMPLETO tal cual aparece en la definición del formulario.

### Algoritmo OBLIGATORIO — sigue estos pasos en orden

**Paso 1**: Extrae todos los campos raíz (sin `condition`) que puedas rellenar del transcript.

**Paso 2 — CRÍTICO**: Para CADA campo que acabas de extraer, revisa si su valor coincide con una opción que tiene `opens`. Si es así, busca en la definición del formulario los campos hijos (los que tienen `condition.field` apuntando a ese padre y `condition.equals` igual al valor que extrajiste). Para cada hijo:
- Si hay información en el transcript (explícita o deducible) → extráelo con su UID compuesto
- Si no hay información → no lo incluyas (pero el padre SÍ debe estar)

**Paso 3**: Repite el paso 2 para los campos hijos que acabas de extraer (pueden tener sus propios `opens` → nietos).

### Ejemplo concreto

El vigilante dice: "le pegó un empujón a mi compañero pero sin lesiones, y se lo metió en la mochila"

Del transcript deduces:
1. Campo "¿Consecuencias sobre personas?" → "Sí" (por "le pegó un empujón")
2. **Paso 2**: "Sí" tiene `opens` → busca campos con `condition.equals = "Sí"` → encuentra "Consecuencias de la agresión" → "Sin lesiones aparentes" (por "sin lesiones") → **INCLUYE con UID compuesto**
3. Campo "¿Medio de ocultación?" → "Sí" (por "mochila")
4. **Paso 2**: "Sí" tiene `opens` → busca campos con `condition.equals = "Sí"` → encuentra "Tipo de ocultación" → "Bandolera / Mochila / bolso" (por "mochila") → **INCLUYE con UID compuesto**

Resultado: debes devolver 4 campos (2 padres + 2 hijos), NO solo los 2 padres.

## Deducción de información implícita

El vigilante habla de forma coloquial. Deduce las opciones EXACTAS del formulario a partir de sus expresiones:

### Modus operandi
- "cogió y se fue" / "salió corriendo con..." / "se llevó" / "agarró" → busca la opción más cercana a "Manipulación manual / carterista / tirón de bolso"
- "rompió el candado" / "forzó" → busca opciones con "Alicates / Elementos de corte" u "Objeto contundente"
- "con un cuchillo" / "navaja" → "Arma blanca"

### Resultado
- "le pillamos" / "le interceptamos" / "detenido" / "la policía se lo llevó" → "A disposición de FFCCS"
- "huyó" / "se escapó" / "no lo encontraron" → "Huida sin recuperación de artículo/os"
- "huyó pero recuperamos la mercancía" → "Huida con recuperación de artículo/os"
- "devolvió" / "pagó" / "abonó" → "Abona el producto y abandona la instalación"

### Asistencias
- "policía" / "agentes" / "policía local" / "policía nacional" → asistencias: "Sí"
- "llamamos a..." / "avisamos a..." → asistencias: "Sí"
- "ambulancia" / "sanitarios" → asistencias: "Sí"

### Detección
- "cámaras" / "CCTV" / "monitor" → detectado mediante: "CCTV"
- "lo vi yo" / "lo vimos" / "lo detectamos" → detectado por: "Personal de Prosegur"
- "el dependiente" / "el cajero" / "personal de la tienda" → detectado por: "Personal del Cliente"
- "alarma" / "arco" / "antihurto" → detectado mediante: "Sistemas Anti-hurto / RFID"
- "un cliente nos avisó" / "alguien nos dijo" → detectado mediante: "Aviso de terceras personas"

### Ocultación
- "mochila" / "bolso" / "bolsa" / "debajo de la ropa" → medio de ocultación: "Sí" **Y TAMBIÉN** tipo de ocultación: busca la opción más cercana (ej: "mochila" → "Bandolera / Mochila / bolso"). Incluye AMBOS campos (padre + hijo con UID compuesto).

### Denuncia
- "pusimos denuncia" / "denunciamos" → denuncia: "Sí" **Y TAMBIÉN** busca en el transcript quién denunció y por qué delito → incluye campos hijos si hay información
- "no se denunció" / "no se ha puesto denuncia" → denuncia: "No"

### Consecuencias
- "no hubo violencia" / "sin consecuencias" / "nadie resultó herido" → consecuencias sobre personas: "No"
- "le pegó" / "agredió" / "golpeó" / "forcejeo" → consecuencias sobre personas: "Sí" **Y TAMBIÉN** tipo de consecuencia: busca la opción más cercana (ej: "empujón sin lesiones" → "Sin lesiones aparentes"). Incluye AMBOS campos (padre + hijo con UID compuesto).

### Asistencias (FORK)
- "policía" / "policía nacional" → asistencias: "Sí" **Y TAMBIÉN** tipo: "Policía Nacional" (no "Policía Local" a menos que lo diga). Incluye AMBOS campos.
- Si menciona hora de llegada → incluye también el campo hijo "Hora de llegada" con UID compuesto
- "doce menos cuarto" = 11:45, "doce y cuarto" = 12:15. Pon atención a "menos" vs "y".

### Quién fue afectado
- Si robaron un producto de la tienda → "El Cliente" (la tienda/empresa es el cliente)
- Si robaron a un empleado → "Personal del Cliente"
- Si robaron a un tercero → "Personal Ajeno / Terceras Personas"

## Reglas importantes

1. Solo incluye campos para los que haya información en el transcript (explícita o deducible). NO inventes datos.
2. Usa SIEMPRE el texto EXACTO de las opciones del formulario como valor. Busca la opción disponible más cercana a lo que dijo el vigilante.
3. Si la información se contradice (ej: primero "huyó" y luego "le detuvimos"), usa la información más reciente.
4. Ignora cualquier campo de tipo adjunto.
5. Si el vigilante no mencionó la hora exacta pero dijo "por la mañana", estima una hora razonable (ej: 09:00:00).
6. Para el campo "Se ha visto afectado": identifica QUIÉN sufrió la pérdida/daño, no quién cometió el hurto.
```

## Configuración del Webhook (child node después del Extract)

**URL**: `POST {backend_url}/api/forms/update`

**Body (Raw mode)**:
```json
{
  "form_id": "hurto-generico",
  "campos": @extract.campos,
  "session_id": "@session_id"
}
```

## Notas

- `@now.iso` — Verificar que esta variable resuelve en HappyRobot dentro del nodo Extract. Si no, buscar la variable de sistema equivalente o inyectar la fecha por otro medio.
- `@voice_agent.transcript` — El transcript completo de la conversación hasta el momento, incluyendo la respuesta de `consultar_estado_formulario` con la definición del formulario.
- `@session_id` — El ID de sesión de HappyRobot, disponible como variable del trigger.
- Si la latencia del Extract es inaceptable, se puede hacer rollback eliminando el nodo Extract y volviendo al flujo anterior (parámetro `campos` directo en el tool).
