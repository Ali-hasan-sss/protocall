export abstract class JSONUtils {
  public static isValidJSON(value: string) {
    try {
      JSON.parse(value)
      return true
    } catch (err) {
      return false
    }
  }
}
