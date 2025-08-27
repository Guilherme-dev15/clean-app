    export {}; // This makes the file a module, necessary for `declare global`

    declare global {
      interface Window {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        XLSX: any; // Or a more specific type if you have one for XLSX
      }
    }