import { act, create, type ReactTestRenderer } from "react-test-renderer";
import SolutionCheckoutButton from "@/components/solutions/SolutionCheckoutButton";

jest.mock("@/lib/google-analytics", () => ({
  trackGoogleAnalyticsConversion: jest.fn(),
}));

type FetchResponsePayload = {
  options?: Array<{ id: string; label: string; eligible?: boolean }>;
  templates?: Array<{
    key: string;
    name: string;
    description: string;
    suitableBusinessType: string;
    workflowsIncluded: number;
    tasksIncluded: number;
    clientStageOutline: string[];
    kpiCategories: string[];
    documentPlaceholders: string[];
    sopPlaceholders: string[];
    previewCategories: string[];
  }>;
  url?: string;
};

function createJsonResponse(payload: FetchResponsePayload, ok = true): Response {
  return {
    ok,
    json: async () => payload,
  } as Response;
}

async function renderComponent(element: React.ReactElement): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | null = null;
  await act(async () => {
    renderer = create(element);
    await Promise.resolve();
  });

  return renderer as ReactTestRenderer;
}

describe("SolutionCheckoutButton", () => {
  const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  const assignMock = jest.fn<void, [string]>();

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          assign: assignMock,
        },
      },
      writable: true,
      configurable: true,
    });
  });

  it("uses contextual targetId, skips selector fetch, and starts checkout", async () => {
    const onStartCheckout = jest.fn();
    fetchMock.mockResolvedValue(createJsonResponse({}));

    const renderer = await renderComponent(
      <SolutionCheckoutButton
        productKey="featured_listing"
        locale="en"
        ctaBehavior="checkout"
        status="active"
        requiredTargetType="listing"
        targetId="11111111-1111-4111-8111-111111111111"
        onStartCheckout={onStartCheckout}
      />,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType("select")).toHaveLength(0);

    const button = renderer.root.findByType("button");
    await act(async () => {
      await button.props.onClick();
    });

    expect(onStartCheckout).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/commerce/checkout");
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.targetId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("treats an option without eligible as selectable", async () => {
    const renderer = await renderComponent(
      <SolutionCheckoutButton
        productKey="featured_listing"
        locale="en"
        ctaBehavior="checkout"
        status="active"
        requiredTargetType="listing"
        targetOptions={[{ id: "listing-a", label: "Listing A" }]}
      />,
    );

    const options = renderer.root.findAllByType("option");
    const listingOption = options[1];
    expect(listingOption.props.value).toBe("listing-a");
    expect(listingOption.props.disabled).not.toBe(true);
  });

  it("disables an option with eligible false", async () => {
    const renderer = await renderComponent(
      <SolutionCheckoutButton
        productKey="featured_listing"
        locale="en"
        ctaBehavior="checkout"
        status="active"
        requiredTargetType="listing"
        targetOptions={[
          { id: "listing-ok", label: "Listing OK", eligible: true },
          { id: "listing-b", label: "Listing B", eligible: false, reason: "Already active" },
        ]}
      />,
    );

    const options = renderer.root.findAllByType("option");
    const listingOption = options[2];
    expect(listingOption.props.value).toBe("");
    expect(listingOption.props.disabled).toBe(true);
  });

  it("includes selected targetId in checkout request", async () => {
    fetchMock.mockResolvedValue(createJsonResponse({}));

    const renderer = await renderComponent(
      <SolutionCheckoutButton
        productKey="featured_listing"
        locale="en"
        ctaBehavior="checkout"
        status="active"
        requiredTargetType="listing"
        targetOptions={[{ id: "listing-c", label: "Listing C", eligible: true }]}
      />,
    );

    const selects = renderer.root.findAllByType("select");
    await act(async () => {
      selects[0].props.onChange({ target: { value: "listing-c" } });
    });

    const button = renderer.root.findByType("button");
    await act(async () => {
      await button.props.onClick();
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.targetId).toBe("listing-c");
  });

  it("disables checkout when target is required but not selected", async () => {
    const renderer = await renderComponent(
      <SolutionCheckoutButton
        productKey="featured_listing"
        locale="en"
        ctaBehavior="checkout"
        status="active"
        requiredTargetType="listing"
        targetOptions={[{ id: "listing-d", label: "Listing D", eligible: true }]}
      />,
    );

    const button = renderer.root.findByType("button");
    expect(button.props.disabled).toBe(true);
  });

  it("invokes onStartCheckout once when checkout begins", async () => {
    const onStartCheckout = jest.fn();
    fetchMock.mockResolvedValue(createJsonResponse({}));

    const renderer = await renderComponent(
      <SolutionCheckoutButton
        productKey="featured_listing"
        locale="en"
        ctaBehavior="checkout"
        status="active"
        requiredTargetType="listing"
        targetId="22222222-2222-4222-8222-222222222222"
        onStartCheckout={onStartCheckout}
      />,
    );

    const button = renderer.root.findByType("button");
    await act(async () => {
      await button.props.onClick();
    });

    expect(onStartCheckout).toHaveBeenCalledTimes(1);
  });

  it("preserves Business-in-a-Box template requirement behavior", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).startsWith("/api/commerce/targets")) {
        return createJsonResponse({
          options: [{ id: "33333333-3333-4333-8333-333333333333", label: "Business A", eligible: true }],
          templates: [
            {
              key: "services_local",
              name: "Local Services",
              description: "Template description",
              suitableBusinessType: "Services",
              workflowsIncluded: 3,
              tasksIncluded: 12,
              clientStageOutline: ["Lead", "Proposal", "Delivery"],
              kpiCategories: ["Leads", "Conversion"],
              documentPlaceholders: ["Proposal"],
              sopPlaceholders: ["Onboarding"],
              previewCategories: ["Operations"],
            },
          ],
        });
      }

      return createJsonResponse({});
    });

    const renderer = await renderComponent(
      <SolutionCheckoutButton
        productKey="business_in_a_box"
        locale="en"
        ctaBehavior="checkout"
        status="active"
        requiredTargetType="business"
      />,
    );

    const buttonBefore = renderer.root.findByType("button");
    expect(buttonBefore.props.disabled).toBe(true);

    const selects = renderer.root.findAllByType("select");
    await act(async () => {
      selects[0].props.onChange({ target: { value: "33333333-3333-4333-8333-333333333333" } });
      selects[1].props.onChange({ target: { value: "services_local" } });
    });

    const buttonAfter = renderer.root.findByType("button");
    expect(buttonAfter.props.disabled).toBe(false);
  });
});
