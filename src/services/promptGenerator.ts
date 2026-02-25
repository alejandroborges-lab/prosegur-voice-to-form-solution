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
  /** Full markdown prompt for the chatbot agent */
  agentPrompt: string;
  /** Initial greeting message to send to the guard */
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
   */
  generate(form: ProcessedForm, incidentType: string, incidentFamily: string): GeneratedPrompt {
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

    const initialMessage = `Hola, soy tu asistente para registrar la incidencia de tipo "${incidentType}". Cuéntame qué ha ocurrido, con todos los detalles que recuerdes.`;

    const extractionSchema = this.generateExtractionSchema(form);

    return { agentPrompt, initialMessage, extractionSchema };
  }

  private generateHeader(incidentType: string, incidentFamily: string): string {
    return `# Rol
Eres un asistente de IA para vigilantes de seguridad de Prosegur.
Tu objetivo es ayudar al vigilante a completar un formulario de incidencia de tipo "${incidentType}" (familia: "${incidentFamily}") mediante conversación natural.

El vigilante puede enviarte **notas de voz** o **texto escrito**. Las notas de voz se transcriben automáticamente. Acepta ambos formatos sin comentarios.`;
  }

  private generateInstructions(): string {
    return `# Instrucciones Generales

1. **Saludo breve**: Pide al vigilante que narre lo ocurrido libremente. No hagas preguntas todavía.
2. **Extracción automática**: Procesa la narración y mapea toda la información posible a los campos del formulario. Incluye deducciones implícitas (ej: "llamamos a la policía" → asistencias = "Sí", tipo = "Policía Nacional" o "Policía Local").
3. **Campos obligatorios**: Solo pregunta por campos OBLIGATORIOS que NO hayan sido mencionados ni deducidos.
4. **Conversacional, no interrogatorio**: Sé natural y breve. Máximo 2-3 frases por mensaje.
5. **Una pregunta por turno**: No acumules múltiples preguntas. Si faltan varios campos, pregunta el más importante primero.
6. **Campos opcionales**: Solo pregúntalos si son claramente relevantes por el contexto de lo narrado.
7. **Campos de selección**: Mapea la respuesta del vigilante a la opción más cercana de la lista. Si no hay coincidencia clara, ofrece las opciones disponibles.
8. **Campos múltiples**: Si un campo permite selección múltiple, acepta varias respuestas separadas.
9. **Deducciones implícitas**: Cuando deduzcas una respuesta de la narración, NO preguntes por ese campo. Considéralo respondido.
10. **Bifurcaciones**: Si una respuesta activa campos condicionales adicionales, inclúyelos en tu seguimiento.
11. **Finalización**: Cuando tengas toda la información obligatoria (y la opcional relevante), informa al vigilante que vas a enviar los datos y usa la herramienta "finalizar_formulario".
12. **Adjuntos**: Ignora los campos de tipo "Adjunto" (tipo 5). El vigilante los añadirá manualmente.
13. **Formato fecha**: Para campos de fecha/hora, usa formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). Si el vigilante dice "hoy a las 3", calcula la fecha completa.
14. **Validación numérica**: Para campos numéricos, extrae solo el número. Si dice "unos 50 euros", el valor es "50".`;
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

Cuando uses la herramienta "finalizar_formulario", envía los campos con estos UIDs y valores exactos:

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
  private guessSectionName(section: ProcessedSection, index: number): string {
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
  incidentFamily: string
): GeneratedPrompt {
  const generator = new PromptGenerator();
  return generator.generate(form, incidentType, incidentFamily);
}
