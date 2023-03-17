/**
 * Count occurances of letter in string
 * @param str
 * @param find
 * @returns
 */
export function countLetter(str: string, find: string) {
  return str.split(find).length - 1;
}
