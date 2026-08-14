import { describe, expect, it } from "vitest"
import { csvRow } from "./csv"

describe("csvRow", () => {
  it("joins plain values with commas and a trailing CRLF", () => {
    expect(csvRow(["a", "b", 1])).toBe("a,b,1\r\n")
  })

  it("quotes a field containing a comma", () => {
    expect(csvRow(["Smith, John", "ok"])).toBe('"Smith, John",ok\r\n')
  })

  it("quotes and doubles internal quotes", () => {
    expect(csvRow(['He said "hi"'])).toBe('"He said ""hi"""\r\n')
  })

  it("quotes a field containing a newline", () => {
    expect(csvRow(["line1\nline2"])).toBe('"line1\nline2"\r\n')
  })

  it("leaves unicode content unescaped (no comma/quote/newline)", () => {
    expect(csvRow(["café", "北京", "Müller"])).toBe("café,北京,Müller\r\n")
  })

  it("renders null and undefined as empty cells", () => {
    expect(csvRow([null, undefined, "x"])).toBe(",,x\r\n")
  })

  it("renders booleans and numbers as their string form", () => {
    expect(csvRow([true, false, 42, 3.5])).toBe("true,false,42,3.5\r\n")
  })
})
