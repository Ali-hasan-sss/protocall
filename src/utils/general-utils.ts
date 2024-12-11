export abstract class GeneralUtils {
  public static generateRandomString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() *
        charactersLength));
    }
    return result;
  }

  public static generateRandomNumbers(length) {
    var result = '';
    var characters = '0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() *
        charactersLength));
    }
    return result;
  }


  /**
   * Function to slice an array given a limit and offset
   * @param array input array
   * @param limit how many records to return
   * @param offset offset to discard elements
   * @returns sliced array or empty if input is null or has length = 0 or even if the params (limit/offset) exceeds the array length
   */
  public static limitOffset<T>(array: T[], limit: number, offset: number): T[] {
    if (!array) return [];

    const length = array.length;

    if (!length) {
      return [];
    }
    if (offset > length - 1) {
      return [];
    }

    const start = Math.min(length - 1, offset);
    const end = Math.min(length, offset + limit);

    return array.slice(start, end);
  }

  public static generateKeywords(string: string): Array<string> {
    const items = string.split(' ');
    const result = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = 1; j <= items.length; j++) {
        const slice = items.slice(i, j);
        if (slice.length)
          result.push(slice.join(' '));
      }
    }
    return result
  }
}
