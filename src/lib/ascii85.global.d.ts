declare global {
    function shorten(array: any[], number: number): void;
    function assertOrBadInput(expression: boolean, message: string): void;

    class Ascii85CodecError extends Error {}

    type SaveString = `<~${string}~>` | `x${string}` | `{${string}}`;

    type ascii85 = {
        Ascii85CodecError: Ascii85CodecError;

        isSave(string: string): string is SaveString;
        encode(bytes: string): SaveString;
        decode(a85text: SaveString): string;
    };

    const ascii85: ascii85;
}

export {};
