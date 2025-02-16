import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',         
  testEnvironment: 'node',   
  transform: {
    '^.+\\.ts$': 'ts-jest', 
  },
  moduleFileExtensions: ['ts', 'js'], 
  testPathIgnorePatterns: ['/node_modules/'],
};

export default config;