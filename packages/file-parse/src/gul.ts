import { GulDocument, GulFormatError } from '@genoffice/gul-engine'

/**
 * Hunminjeongeum (.gul) document to plain text: the body pages in order, then the text in
 * frames (tables, text boxes), one paragraph per line, runs of blank lines folded to one.
 * Throws a readable error for a file that is not a .gul, is encrypted, or comes from a
 * version the engine does not read.
 */
export function gulToText(bytes: Uint8Array): string {
  if (!GulDocument.isGul(bytes)) {
    throw new Error('Cannot read .gul: not a Hunminjeongeum document, or a damaged one')
  }
  let doc: GulDocument
  try {
    doc = GulDocument.open(bytes)
  } catch (error) {
    if (error instanceof GulFormatError) {
      throw new Error(
        `Cannot read .gul: ${error.message} (an encrypted document, or a version or structure not supported yet)`,
        { cause: error },
      )
    }
    throw error
  }
  return doc
    .text()
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
