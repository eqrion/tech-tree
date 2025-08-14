// Module declaration to fix DOMPurify's import from 'trusted-types/lib'
declare module "trusted-types/lib" {
  export class TrustedHTML {
    private constructor();
    private brand: true;
  }

  export class TrustedScript {
    private constructor();
    private brand: true;
  }

  export class TrustedScriptURL {
    private constructor();
    private brand: true;
  }

  export abstract class TrustedTypePolicyFactory {
    createPolicy<Options extends TrustedTypePolicyOptions>(
      policyName: string,
      policyOptions?: Options,
    ): Pick<
      TrustedTypePolicy<Options>,
      "name" | Extract<keyof Options, FnNames>
    >;
    isHTML(value: unknown): value is TrustedHTML;
    isScript(value: unknown): value is TrustedScript;
    isScriptURL(value: unknown): value is TrustedScriptURL;
    readonly emptyHTML: TrustedHTML;
    readonly emptyScript: TrustedScript;
    getAttributeType(
      tagName: string,
      attribute: string,
      elementNs?: string,
      attrNs?: string,
    ): string | null;
    getPropertyType(
      tagName: string,
      property: string,
      elementNs?: string,
    ): string | null;
    readonly defaultPolicy: TrustedTypePolicy | null;
  }

  export abstract class TrustedTypePolicy<
    Options extends TrustedTypePolicyOptions = TrustedTypePolicyOptions,
  > {
    readonly name: string;
    createHTML(...args: Args<Options, "createHTML">): TrustedHTML;
    createScript(...args: Args<Options, "createScript">): TrustedScript;
    createScriptURL(
      ...args: Args<Options, "createScriptURL">
    ): TrustedScriptURL;
  }

  export interface TrustedTypePolicyOptions {
    createHTML?: ((input: string, ...arguments: any[]) => string) | undefined;
    createScript?: ((input: string, ...arguments: any[]) => string) | undefined;
    createScriptURL?:
      | ((input: string, ...arguments: any[]) => string)
      | undefined;
  }

  export interface TrustedTypesWindow {
    trustedTypes?: TrustedTypePolicyFactory | undefined;
    TrustedHTML: typeof TrustedHTML;
    TrustedScript: typeof TrustedScript;
    TrustedScriptURL: typeof TrustedScriptURL;
    TrustedTypePolicyFactory: typeof TrustedTypePolicyFactory;
    TrustedTypePolicy: typeof TrustedTypePolicy;
  }

  export type FnNames = keyof TrustedTypePolicyOptions;
  export type Args<
    Options extends TrustedTypePolicyOptions,
    K extends FnNames,
  > = Parameters<NonNullable<Options[K]>>;
}
