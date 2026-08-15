import fs from "fs";
import path from "path";
import ts from "typescript";

describe("partner communications page source", () => {
  it("is valid TSX without parser errors", () => {
    const filePath = path.join(
      process.cwd(),
      "app/[locale]/partner-communications/page.tsx",
    );
    const source = fs.readFileSync(filePath, "utf8");

    const result = ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.Preserve,
        target: ts.ScriptTarget.ESNext,
      },
      fileName: filePath,
      reportDiagnostics: true,
    });

    const syntaxErrors = (result.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );

    expect(syntaxErrors).toHaveLength(0);
  });
});
