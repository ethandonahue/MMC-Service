import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',         
  testEnvironment: 'node',   
  transform: {
    '^.+\\.ts$': 'ts-jest', 
  },
  moduleFileExtensions: ['ts', 'js'], 
  testPathIgnorePatterns: ['/node_modules/'],
  // moduleNameMapper: {
  //   '^@/(.*)$': '<rootDir>/src/$1',
  // },  
};

export default config;