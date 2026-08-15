import path from "path";
import ts from "typescript";

describe("partner communications page source", () => {
  it("is valid TSX without parser errors", () => {
    const filePath = path.join(
      process.cwd(),
      "app/[locale]/partner-communications/page.tsx",
    );
    const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
    const readConfig = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

    expect(readConfig.error).toBeUndefined();

    const parsedConfig = ts.parseJsonConfigFileContent(
      readConfig.config,
      ts.sys,
      process.cwd(),
    );

    const program = ts.createProgram([filePath], {
      ...parsedConfig.options,
      noEmit: true,
    });
    const sourceFile = program.getSourceFile(filePath);

    expect(sourceFile).toBeDefined();

    const syntaxErrors = program.getSyntacticDiagnostics(sourceFile!);
    const syntaxErrorMessages = syntaxErrors.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
    expect(syntaxErrorMessages).toEqual([]);
  });
});
