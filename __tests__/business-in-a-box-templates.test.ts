describe("Business-in-a-Box template registry", () => {
  it("contains exactly the approved template keys", async () => {
    const { BUSINESS_IN_A_BOX_TEMPLATE_KEYS } = await import(
      "@/lib/commerce/business-in-a-box-templates"
    );

    expect(BUSINESS_IN_A_BOX_TEMPLATE_KEYS).toEqual([
      "remote_consulting",
      "creative_agency",
      "online_tutoring",
      "software_agency",
      "virtual_assistant",
      "marketing_agency",
      "ecommerce",
      "bookkeeping",
    ]);
  });

  it("rejects missing, malformed, and unknown template keys", async () => {
    const { getBusinessInABoxTemplate } = await import(
      "@/lib/commerce/business-in-a-box-templates"
    );

    expect(getBusinessInABoxTemplate("")).toBeNull();
    expect(getBusinessInABoxTemplate("../../evil")).toBeNull();
    expect(getBusinessInABoxTemplate("unknown_template")).toBeNull();
  });

  it("all approved templates are active and expose localized summaries", async () => {
    const {
      BUSINESS_IN_A_BOX_TEMPLATE_KEYS,
      getBusinessInABoxTemplate,
      listPublicBusinessInABoxTemplateSummaries,
    } = await import("@/lib/commerce/business-in-a-box-templates");

    for (const key of BUSINESS_IN_A_BOX_TEMPLATE_KEYS) {
      const template = getBusinessInABoxTemplate(key);
      expect(template).not.toBeNull();
      expect(template?.active).toBe(true);
      expect(template?.version).toBeTruthy();
      expect(template?.clientPipelineStages.length).toBeGreaterThan(0);
      expect(template?.starterTasks.length).toBeGreaterThan(0);
      expect(template?.documentChecklist.length).toBeGreaterThan(0);
    }

    const en = listPublicBusinessInABoxTemplateSummaries("en");
    const es = listPublicBusinessInABoxTemplateSummaries("es");
    expect(en).toHaveLength(8);
    expect(es).toHaveLength(8);
    expect(en[0]?.name).not.toBe(es[0]?.name);
  });
});
