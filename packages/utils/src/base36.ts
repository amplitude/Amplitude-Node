export const DEVICE_ID_LENGTH = 25;

const BASE_36_CHARACTER_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BASE_36_RADIX = 36;

/** Generates a random sequence of base 36 characters to the specified length */
export const generateBase36Id = (idLength: number = DEVICE_ID_LENGTH): string => {
  let stringBuilder = '';
  for (let idx = 0; idx < idLength; idx++) {
    const nextChar = BASE_36_CHARACTER_SET.charAt(Math.floor(Math.random() * BASE_36_RADIX));
    stringBuilder += nextChar;
  }

  return stringBuilder;
};
