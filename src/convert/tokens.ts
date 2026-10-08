/** Models read a PDF page as its text plus an image of the page; this is a rough cost for that image. */
export const IMAGE_TOKENS_PER_PAGE = 1500

/** Rough token count: about four characters per token. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 4)

/** Rough cost of sending the PDF itself instead of the converted text. */
export const estimatePdfTokens = (textTokens: number, pages: number) => textTokens + pages * IMAGE_TOKENS_PER_PAGE
