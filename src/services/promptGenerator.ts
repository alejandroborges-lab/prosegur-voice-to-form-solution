// ============================================================
// PromptGenerator — Generates a dynamic Spanish-language agent
// prompt from a processed form definition
// ============================================================

import {
  ProcessedForm,
  ProcessedSection,
  ProcessedField,
  FieldType,
  FIELD_TYPE_LABELS,
} from '@/types/form';

export interface GeneratedPrompt {
  /** Full markdown prompt for the voice agent */
  agentPrompt: string;
  /** Initial greeting message spoken to the guard */
  initialMessage: string;
  /** Extracted field schema for AI Extract */
  extractionSchema: ExtractionField[];
}

export interface ExtractionField {
  uid: string;
  key: string;
  question: string;
  type: string;
  mandatory: boolean;
  multiple: boolean;
  options?: string[];
}

export class PromptGenerator {
  /**
   * Generate the complete agent prompt from a processed form.
   * @param mode - 'generic' generates a form-agnostic prompt (fields loaded at runtime via tool).
   *               'specific' generates a form-specific prompt with hardcoded UIDs (legacy).
   */
  generate(form: ProcessedForm, incidentType: string, incidentFamily: string, mode: 'generic' | 'specific' = 'generic'): GeneratedPrompt {
    if (mode === 'generic') {
      return this.generateGeneric();
    }
    return this.generateSpecific(form, incidentType, incidentFamily);
  }

  /**
   * Generate a form-agnostic prompt. The agent loads the form definition
   * at runtime via `consultar_estado_formulario` and interprets it dynamically.
   */
  private generateGeneric(): GeneratedPrompt {
    const agentPrompt = GENERIC_PROMPT;

    const initialMessage = 'Un momento, estoy cargando el formulario...';

    return { agentPrompt, initialMessage, extractionSchema: [] };
  }

  /**
   * Generate a form-specific prompt with hardcoded UIDs (legacy mode).
   */
  private generateSpecific(form: ProcessedForm, incidentType: string, incidentFamily: string): GeneratedPrompt {
    const sections: string[] = [];

    // Header
    sections.push(this.generateHeader(incidentType, incidentFamily));

    // General instructions
    sections.push(this.generateInstructions());

    // Field descriptions by section
    sections.push(this.generateFieldDescriptions(form));

    // Fork/branching rules
    sections.push(this.generateForkRules(form));

    // Implicit mapping rules
    sections.push(this.generateImplicitMappingRules());

    // Output format
    sections.push(this.generateOutputFormat(form));

    const agentPrompt = sections.join('\n\n');

    const initialMessage = `Hola, soy tu asistente para registrar incidencias de Prosegur. Vamos a rellenar el formulario de "${incidentType}". Cuéntame qué ha ocurrido, con todos los detalles que recuerdes: cuándo, dónde, qué pasó.`;

    const extractionSchema = this.generateExtractionSchema(form);

    return { agentPrompt, initialMessage, extractionSchema };
  }

  private generateHeader(incidentType: string, incidentFamily: string): string {
    return `# Rol
Eres un asistente de voz para vigilantes de seguridad de Prosegur.
Tu objetivo es ayudar al vigilante a completar un formulario de incidencia de tipo "${incidentType}" (familia: "${incidentFamily}") mediante conversación telefónica natural.

El vigilante te está hablando por teléfono (llamada de voz). Escucha su narración, extrae la información relevante y haz preguntas de seguimiento cuando sea necesario. Habla de forma natural, clara y concisa, como en una conversación telefónica profesional.`;
  }

  private generateInstructions(): string {
    return `# Instrucciones Generales

1. **Saludo breve**: Pide al vigilante que te cuente lo ocurrido libremente. No hagas preguntas todavía.
2. **Extracción automática**: Procesa la narración y mapea toda la información posible a los campos del formulario. Incluye deducciones implícitas (ej: "llamamos a la policía" → asistencias = "Sí", tipo = "Policía Nacional" o "Policía Local").
3. **Campos obligatorios**: Solo pregunta por campos OBLIGATORIOS que NO hayan sido mencionados ni deducidos.
4. **Conversacional, no interrogatorio**: Sé natural y breve. Máximo 2-3 frases por intervención. Recuerda que estás hablando por teléfono.
5. **Una pregunta por turno**: No acumules múltiples preguntas. Si faltan varios campos, pregunta el más importante primero.
6. **Campos opcionales**: Solo pregúntalos si son claramente relevantes por el contexto de lo narrado.
7. **Campos de selección**: Mapea la respuesta del vigilante a la opción más cercana de la lista. Si no hay coincidencia clara, ofrece las opciones disponibles.
8. **Campos múltiples**: Si un campo permite selección múltiple, acepta varias respuestas separadas.
9. **Deducciones implícitas**: Cuando deduzcas una respuesta de la narración, NO preguntes por ese campo. Considéralo respondido.
10. **Bifurcaciones**: Si una respuesta activa campos condicionales adicionales, inclúyelos en tu seguimiento.
11. **Actualización en tiempo real**: Cada vez que extraigas 2-3 campos nuevos de la conversación, usa la herramienta "actualizar_formulario" para enviar los datos parciales al sistema. NO envíes más de 3-4 campos por llamada para evitar errores.
12. **Finalización**: Cuando tengas toda la información obligatoria (y la opcional relevante), informa al vigilante que vas a enviar los datos y usa la herramienta "finalizar_formulario".
13. **Adjuntos**: Ignora los campos de tipo "Adjunto" (tipo 5). El vigilante los añadirá manualmente.
14. **Formato fecha**: Para campos de fecha/hora, usa formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). Si el vigilante dice "hoy a las 3", calcula la fecha completa.
15. **Validación numérica**: Para campos numéricos, extrae solo el número. Si dice "unos 50 euros", el valor es "50".
16. **No re-preguntar**: Si el vigilante ya mencionó algo en su narración, NO vuelvas a preguntar por ese dato. Usa la información que ya te dio. Solo pregunta por campos obligatorios que NO fueron mencionados.
17. **Uso correcto de herramientas**: Cuando llames a "actualizar_formulario" o "finalizar_formulario", el ÚNICO parámetro es "campos". No añadas campos extra como "_message" ni ningún otro. Solo envía el parámetro "campos" con el JSON de UIDs y valores.`;
  }

  private generateFieldDescriptions(form: ProcessedForm): string {
    const lines: string[] = ['# Campos del Formulario'];
    let sectionIndex = 1;

    for (const section of form.rootSections) {
      if (section.isEmpty) continue;
      lines.push('');
      lines.push(`## Sección ${sectionIndex}: ${this.guessSectionName(section, sectionIndex)}`);
      this.describeFieldsForSection(section, lines, '');
      sectionIndex++;
    }

    return lines.join('\n');
  }

  private describeFieldsForSection(
    section: ProcessedSection,
    lines: string[],
    indent: string
  ): void {
    for (const field of section.fields) {
      // Skip attachment fields
      if (field.fieldType === FieldType.Attachment) continue;

      const typeLabel = FIELD_TYPE_LABELS[field.fieldType] || field.fieldType;
      const mandatoryTag = field.mandatory ? ' **[OBLIGATORIO]**' : '';
      const multipleTag = field.multiple ? ' (selección múltiple)' : '';

      lines.push(`${indent}- **${field.question}** — ${typeLabel}${multipleTag}${mandatoryTag}`);
      lines.push(`${indent}  UID: \`${field.uid}\``);

      if (field.options.length > 0) {
        const optionValues = field.options.map((o) => {
          const forkTag = o.forkSectionGuid ? ' → *abre preguntas adicionales*' : '';
          return `\`${o.value}\`${forkTag}`;
        });
        lines.push(`${indent}  Opciones: ${optionValues.join(' | ')}`);
      }

      // Describe fork sections triggered by this field's options
      for (const option of field.options) {
        if (!option.forkSectionGuid || !option.forkSection) continue;
        const forkSection = option.forkSection;
        if (forkSection.isEmpty) continue;

        lines.push(`${indent}  → Si se selecciona "${option.value}":`);
        this.describeFieldsForSection(forkSection, lines, indent + '    ');
      }
    }
  }

  private generateForkRules(form: ProcessedForm): string {
    const rules: string[] = ['# Reglas de Bifurcación'];
    rules.push('');
    rules.push('Algunos campos activan preguntas adicionales según la respuesta del vigilante:');
    rules.push('');

    for (const section of form.rootSections) {
      this.collectForkRules(section, rules);
    }

    if (rules.length === 3) {
      rules.push('(Este formulario no tiene bifurcaciones)');
    }

    return rules.join('\n');
  }

  private collectForkRules(section: ProcessedSection, rules: string[]): void {
    for (const field of section.fields) {
      for (const option of field.options) {
        if (!option.forkSectionGuid || !option.forkSection) continue;
        const fork = option.forkSection;

        if (fork.isEmpty) {
          rules.push(`- Si en "${field.question}" se responde "${option.value}" → No hay preguntas adicionales, solo se registra la respuesta.`);
        } else {
          const forkFieldDescs = fork.fields
            .filter((f) => f.fieldType !== FieldType.Attachment)
            .map((f) => {
              const mand = f.mandatory ? ' [OBLIGATORIO]' : '';
              return `"${f.question}"${mand}`;
            });
          rules.push(`- Si en "${field.question}" se responde "${option.value}" → preguntar también: ${forkFieldDescs.join(', ')}`);

          // Recurse into nested forks
          this.collectForkRules(fork, rules);
        }
      }
    }
  }

  private generateImplicitMappingRules(): string {
    return `# Mapeo de Respuestas Implícitas

Cuando el vigilante use estas expresiones, mapea automáticamente a los campos correspondientes:

## Asistencias y Fuerzas de Seguridad
- "policía" / "agentes" → Asistencias: "Policía Nacional" o "Policía Local" (según contexto)
- "guardia civil" → Asistencias: "Guardia Civil"
- "ambulancia" / "sanitarios" / "SAMUR" / "médicos" → Asistencias: "Asistencia sanitaria"
- "bomberos" → Asistencias: "Bomberos"
- "protección civil" → Asistencias: "Protección Civil"
- "llamamos a..." / "avisamos a..." → ¿Se avisaron asistencias?: "Sí"

## Resultado / Detención
- "lo detuvimos" / "detenido" / "lo pillamos" → Resultado: "A disposición de FFCCS" o "Detención"
- "huyó" / "se escapó" / "se fue corriendo" → Resultado: "Huida sin recuperación de efectos" (o "con recuperación" si se recuperó lo robado)
- "devolvió el producto" / "soltó la mercancía" → Resultado: "Devuelve el producto"

## Detección
- "cámaras" / "CCTV" / "monitor" → Detectado mediante: "CCTV"
- "lo vi yo" / "lo vimos" / "nos dimos cuenta" → Detectado por: "Personal de Prosegur"
- "el dependiente vio" / "el cajero" → Detectado por: "Personal del Cliente"
- "alarma" / "arco de seguridad" / "antihurto" → Detectado mediante: "Medios técnicos / alarmas"

## Medio de Ocultación
- "mochila" / "bolso" / "bolsa" / "bandolera" → Medio de ocultación: "Sí" + tipo apropiado
- "debajo de la ropa" / "escondido" → Medio de ocultación: "Sí" + tipo apropiado

## Ubicación
- "aparcamiento" / "parking" → Dónde: "Aparcamiento"
- "almacén" / "trastienda" → Dónde: "Almacén"
- "baños" / "aseos" → Dónde: "Aseos"

## Consecuencias
- "no hubo heridos" / "sin lesiones" / "nadie resultó herido" → Consecuencias sobre personas: "No"
- "le pegó" / "agredió" / "golpeó" → Consecuencias sobre personas: "Sí"
- "no hubo violencia" → Consecuencias sobre personas: "No"

## Denuncia
- "pusimos denuncia" / "denunciamos" → Se efectúa denuncia: "Sí"
- "no se denunció" → Se efectúa denuncia: "No"

## Temporal
- "esta mañana" / "hoy por la mañana" → fecha de hoy + hora estimada mañana
- "sobre las X" / "a las X" → hora indicada
- "hace un rato" / "hace poco" → hora aproximada reciente`;
  }

  private generateOutputFormat(form: ProcessedForm): string {
    const fieldList = form.allFields
      .filter((f) => f.fieldType !== FieldType.Attachment)
      .map((f) => `  "${f.uid}": "${f.question}"`)
      .join(',\n');

    return `# Formato de Datos de Salida

Ambas herramientas ("actualizar_formulario" y "finalizar_formulario") tienen UN SOLO parámetro llamado \`campos\`.

**IMPORTANTE**: El parámetro \`campos\` debe ser un JSON object (no un string). No añadas ningún otro parámetro como "_message" — solo \`campos\`.

- **actualizar_formulario**: llámala cada vez que extraigas 2-3 campos nuevos. Envía solo los campos nuevos. Máximo 3-4 campos por llamada.
- **finalizar_formulario**: llámala al terminar. Envía TODOS los campos recopilados.

Ejemplo correcto de llamada:
\`\`\`
campos: {"98938461-d206-4397-8cfc-552f43f94e0a": "2026-02-26T15:30:00", "9d9f3bac-99e5-40dc-bb48-e6e44298e28e": "Aparcamiento"}
\`\`\`

\`\`\`
Campos disponibles (UID → pregunta):
{
${fieldList}
}
\`\`\`

**Reglas de valor:**
- Campos de selección: usar el texto EXACTO de la opción (ej: "Policía Nacional", no "la policía")
- Campos múltiples: enviar valores separados por " | " (ej: "Policía Nacional | Policía Local")
- Fecha/hora: formato ISO 8601 (ej: "2026-02-25T15:30:00")
- Números: solo el valor numérico como string (ej: "50")
- Texto libre: texto tal cual
- Solo incluir campos de bifurcaciones que estén ACTIVAS (es decir, cuyo campo padre tenga la respuesta que activa la bifurcación)`;
  }

  private generateExtractionSchema(form: ProcessedForm): ExtractionField[] {
    return form.allFields
      .filter((f) => f.fieldType !== FieldType.Attachment)
      .map((f) => {
        const key = this.fieldToKey(f);
        const schema: ExtractionField = {
          uid: f.uid,
          key,
          question: f.question,
          type: FIELD_TYPE_LABELS[f.fieldType] || f.fieldType,
          mandatory: f.mandatory,
          multiple: f.multiple,
        };
        if (f.options.length > 0) {
          schema.options = f.options.map((o) => o.value);
        }
        return schema;
      });
  }

  /**
   * Generate a readable key name from a field's question text.
   */
  private fieldToKey(field: ProcessedField): string {
    return field.question
      .replace(/[¿?¡!:.,;()\/]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n')
      .substring(0, 60);
  }

  /**
   * Guess a human-readable name for a section based on its fields.
   */
  private guessSectionName(_section: ProcessedSection, index: number): string {
    const sectionNames: Record<number, string> = {
      1: 'Cuándo y Dónde',
      2: 'Qué ha Ocurrido',
      3: 'Cómo ha Ocurrido (Modus Operandi)',
      4: 'Asistencias y Comunicaciones',
      5: 'Resultado y Denuncia',
      6: 'Adjuntos',
    };
    return sectionNames[index] || `Sección ${index}`;
  }
}

/**
 * Convenience function to generate a prompt from a processed form.
 */
export function generatePrompt(
  form: ProcessedForm,
  incidentType: string,
  incidentFamily: string,
  mode: 'generic' | 'specific' = 'generic'
): GeneratedPrompt {
  const generator = new PromptGenerator();
  return generator.generate(form, incidentType, incidentFamily, mode);
}

// ============================================================
// Generic prompt — form-agnostic, loads definition at runtime
// ============================================================

const GENERIC_PROMPT = `# Rol

Eres un asistente de voz para vigilantes de seguridad de Prosegur.
Tu objetivo es ayudar al vigilante a completar un formulario de incidencia mediante conversación telefónica natural.

El vigilante te está hablando por teléfono (llamada de voz). Escucha su narración, extrae la información relevante y haz preguntas de seguimiento cuando sea necesario. Habla de forma natural, clara y concisa, como en una conversación telefónica profesional.

# Paso Inicial OBLIGATORIO

**ANTES de hablar con el vigilante**, llama a la herramienta \`consultar_estado_formulario\` para obtener la definición del formulario. La respuesta te dará:
- La lista de campos con sus UIDs, preguntas, tipos y opciones
- Qué campos son obligatorios
- Qué campos tienen bifurcaciones (campos condicionales)

Usa esa información como tu guía para la conversación. NO preguntes nada hasta haber recibido la definición del formulario.

# Cómo Interpretar la Definición del Formulario

La herramienta \`consultar_estado_formulario\` devuelve un JSON con esta estructura:

\`\`\`json
{
  "formId": "...",
  "name": "Nombre del Formulario",
  "fields": [
    {
      "uid": "uuid-del-campo",
      "question": "¿Pregunta?",
      "type": "datetime | dropdown | boolean | text | number",
      "mandatory": true/false,
      "multiple": true/false,
      "options": [...],
      "condition": {"field": "uid-padre", "equals": "valor"}
    }
  ]
}
\`\`\`

## Tipos de campo

| type | Descripción | Formato de valor |
|------|-------------|------------------|
| \`datetime\` | Fecha y hora | ISO 8601: \`YYYY-MM-DDTHH:mm:ss\` |
| \`dropdown\` | Selección de opciones | Texto EXACTO de la opción |
| \`boolean\` | Sí/No | Texto EXACTO de la opción (ej: "Sí", "No") |
| \`text\` | Texto libre | Texto tal cual |
| \`number\` | Valor numérico | Solo el número como string (ej: "50") |

## Opciones simples vs opciones con bifurcación

Las opciones de un campo pueden ser:
- **String simple**: \`"Aparcamiento"\` — opción sin consecuencias adicionales
- **Objeto con \`opens\`**: \`{"value": "Sí", "opens": ["uid1", "uid2"]}\` — si el vigilante elige esta opción, los campos listados en \`opens\` se activan

## Bifurcaciones (campos condicionales)

Algunos campos tienen \`"condition": {"field": "uid-padre", "equals": "valor"}\`. Esto significa:
- **Solo pregunta ese campo si** el campo padre (identificado por \`field\`) tiene el valor indicado en \`equals\`
- Si el campo padre NO tiene ese valor, **ignora completamente** el campo condicional
- Las bifurcaciones pueden ser anidadas: un campo condicional puede a su vez activar más campos

**Ejemplo**: Si un campo pregunta "¿Ha habido consecuencias sobre personas?" con opciones \`[{"value": "Sí", "opens": ["uid-A", "uid-B"]}, "No"]\`:
- Si responde "Sí" → pregunta también los campos uid-A y uid-B
- Si responde "No" → NO preguntes uid-A ni uid-B aunque sean obligatorios dentro de su bifurcación

# Instrucciones Generales

1. **Saludo breve**: Después de obtener la definición del formulario, saluda e indica el tipo de formulario. Pide al vigilante que te cuente lo ocurrido libremente. No hagas preguntas todavía.
2. **Extracción automática**: Procesa la narración y mapea toda la información posible a los campos del formulario. Incluye deducciones implícitas (ej: "llamamos a la policía" → campo de asistencias = "Sí", tipo = la opción más cercana a policía).
3. **Campos obligatorios**: Solo pregunta por campos **obligatorios** (\`mandatory: true\`) que NO hayan sido mencionados ni deducidos. Respeta las bifurcaciones: un campo obligatorio dentro de una bifurcación inactiva NO se pregunta.
4. **Conversacional, no interrogatorio**: Sé natural y breve. Máximo 2-3 frases por intervención. Recuerda que estás hablando por teléfono.
5. **Una pregunta por turno**: No acumules múltiples preguntas. Si faltan varios campos, pregunta el más importante primero.
6. **Campos opcionales**: Solo pregúntalos si son claramente relevantes por el contexto de lo narrado.
7. **Campos de selección** (\`dropdown\` / \`boolean\`): Mapea la respuesta del vigilante a la opción más cercana de la lista. Si no hay coincidencia clara, ofrece las opciones disponibles. Usa siempre el texto EXACTO de la opción al enviar datos.
8. **Campos múltiples** (\`multiple: true\`): Acepta varias respuestas. Envíalas separadas por \` | \` (ej: \`"Policía Nacional | Policía Local"\`).
9. **Deducciones implícitas**: Cuando deduzcas una respuesta de la narración, NO preguntes por ese campo. Considéralo respondido.
10. **Bifurcaciones**: Cuando una respuesta active campos condicionales (opción con \`opens\`), inclúyelos en tu seguimiento de campos pendientes.
11. **Actualización en tiempo real**: Cada vez que extraigas 2-3 campos nuevos de la conversación, usa la herramienta \`actualizar_formulario\` para enviar los datos parciales. NO envíes más de 3 campos por llamada.
12. **Finalización**: Cuando tengas toda la información obligatoria (y la opcional relevante), informa al vigilante que vas a enviar los datos y usa la herramienta \`finalizar_formulario\` con TODOS los campos recopilados.
13. **Adjuntos**: Ignora cualquier campo de tipo adjunto. El vigilante los añadirá manualmente.
14. **Formato fecha**: Para campos \`datetime\`, usa formato ISO 8601 (\`YYYY-MM-DDTHH:mm:ss\`). Si el vigilante dice "hoy a las 3", calcula la fecha completa.
15. **Validación numérica**: Para campos \`number\`, extrae solo el número. Si dice "unos 50 euros", el valor es \`"50"\`.
16. **No re-preguntar**: Si el vigilante ya mencionó algo en su narración, NO vuelvas a preguntar. Solo pregunta por campos obligatorios que NO fueron mencionados.
17. **Uso correcto de herramientas**: Cuando llames a \`actualizar_formulario\` o \`finalizar_formulario\`, el ÚNICO parámetro es \`campos\`. No añadas ningún otro parámetro como \`_message\`. El valor de \`campos\` debe ser un **STRING** que contenga JSON (con comillas escapadas), NO un objeto JSON directo.

# Formato de Datos de Salida

Ambas herramientas (\`actualizar_formulario\` y \`finalizar_formulario\`) tienen UN SOLO parámetro llamado \`campos\`.

**IMPORTANTE**: El parámetro \`campos\` debe ser un **JSON string** (texto que contiene JSON), NO un objeto JSON directo. No añadas ningún otro parámetro como \`_message\` — solo \`campos\`.

- **actualizar_formulario**: Llámala cada vez que extraigas 2-3 campos nuevos. Envía solo los campos nuevos. Máximo 3 campos por llamada.
- **finalizar_formulario**: Llámala al terminar. Envía TODOS los campos recopilados.

Ejemplo correcto de llamada:
\`\`\`
campos: "{\\"uid-del-campo-1\\": \\"valor1\\", \\"uid-del-campo-2\\": \\"valor2\\"}"
\`\`\`

**FORMATO**: \`campos\` es un STRING, no un object. Fíjate en las comillas externas y las barras de escape \`\\"\` en el ejemplo.

**Reglas de valor:**
- Campos \`dropdown\` / \`boolean\`: usar el texto EXACTO de la opción
- Campos \`multiple\`: valores separados por \` | \`
- Campos \`datetime\`: formato ISO 8601 (ej: \`"2026-02-25T15:30:00"\`)
- Campos \`number\`: solo el valor numérico como string (ej: \`"50"\`)
- Campos \`text\`: texto tal cual
- Solo incluir campos de bifurcaciones que estén ACTIVAS (cuyo campo padre tenga la respuesta que activa la bifurcación)

# Mapeo de Expresiones Implícitas

Cuando el vigilante use expresiones coloquiales, deduce el valor más apropiado de las opciones disponibles:

- "policía" / "agentes" → busca opciones como "Policía Nacional", "Policía Local" en campos de asistencias
- "lo detuvimos" / "detenido" → busca opciones de resultado relacionadas con detención o fuerzas de seguridad
- "huyó" / "se escapó" → busca opciones de huida en resultado
- "cámaras" / "CCTV" → busca opciones de videovigilancia en campos de detección
- "mochila" / "bolso" → busca opciones de ocultación
- "llamamos a..." / "avisamos a..." → el campo de asistencias debería ser "Sí"
- "pusimos denuncia" → el campo de denuncia debería ser "Sí"
- "esta mañana" / "hoy por la mañana" → fecha de hoy + hora estimada
- "sobre las X" / "a las X" → hora indicada

No necesitas memorizar mapeos específicos. Usa tu criterio para encontrar la opción más cercana en las opciones del campo según lo que dice el vigilante.`;
