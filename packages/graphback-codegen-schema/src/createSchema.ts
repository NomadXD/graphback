import { InputModelTypeContext } from '@graphback/core'
import { gqlSchemaFormatter, jsSchemaFormatter } from './schemaFormatters';
import { SchemaGenerator, tsSchemaFormatter } from '.';

export interface SchemaGeneratorOptions {
    //output format
    format: 'ts' | 'js' | 'gql'
}

/**
 * Create resolvers function that 
 * @param inputContext 
 * @param options 
 */
export const createSchema = (inputContext: InputModelTypeContext[], options: SchemaGeneratorOptions): string => {
    if (options) {
        if (options.format === 'ts') {
            return new SchemaGenerator(inputContext, tsSchemaFormatter).generate();
        }
        if (options.format === 'js') {
            return new SchemaGenerator(inputContext, jsSchemaFormatter).generate();;
        }
        if (options.format === 'gql') {
            return new SchemaGenerator(inputContext, gqlSchemaFormatter).generate();
        }
    }
    throw Error("Invalid format specified. `options.format` supports only `ts`, `js` and `gql` flags");
}
