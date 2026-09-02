import createModelSchema from "../api/createModelSchema";
import getDefaultModelSchema from "../api/getDefaultModelSchema";
import { Clazz, ClazzOrModelSchema, ModelSchema } from "../api/types";
import { isModelSchema } from "./utils";

/**
 * A simple util that retrieve the existing schema or create a default one.
 * @param src
 * @returns
 */
export const getOrCreateSchema = <T extends object>(src: ClazzOrModelSchema<T>): ModelSchema<T> => {
    if (isModelSchema(src)) {
        return src;
    } else {
        let schema = getDefaultModelSchema<T>(src);
        if (!schema) {
            schema = createModelSchema(src, {});
        }
        return schema;
    }
};

/**
 * Retrieves the model schema that `clazz` itself owns, creating one if the only
 * schema reachable from `clazz` belongs to an ancestor.
 *
 * A model schema is stored as a static `serializeInfo` on the class, and statics
 * are inherited through the prototype chain. `getDefaultModelSchema` therefore
 * answers with an ANCESTOR's schema for a class that declares no `@serializable`
 * property of its own — the two are indistinguishable from the outside.
 *
 * That matters wherever a schema is about to be mutated per-class, as `subSchema`
 * does when it stamps on a discriminator: without this, sibling subclasses share
 * one schema object and the last registration silently wins for all of them.
 *
 * The created schema is empty, and `createModelSchema` links its `extends` to the
 * inherited schema, so properties declared further up still (de)serialize.
 *
 * @param clazz class or constructor function
 * @returns the schema owned by `clazz`
 */
export const getOrCreateOwnSchema = <T extends object>(clazz: Clazz<T>): ModelSchema<T> => {
    const schema = getDefaultModelSchema<T>(clazz);
    // Only create when the resolved schema is an ancestor's. `createModelSchema`
    // REPLACES any schema the class already owns, so calling it unconditionally
    // would discard the class's own properties.
    if (schema && schema.targetClass === clazz) {
        return schema;
    }
    return createModelSchema(clazz, {});
};
