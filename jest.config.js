module.exports = {
  modulePathIgnorePatterns: ['<rootDir>/build'],
  presets: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
