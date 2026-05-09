import * as utils from "../src/utils";

describe("utils.formatZentaoUrl", () => {
  it("formatZentaoUrl", () => {
    expect(utils.formatZentaoUrl("http://demo.zentao.net/")).toBe("http://demo.zentao.net/");
    expect(utils.formatZentaoUrl("http://demo.zentao.net")).toBe("http://demo.zentao.net/");
    expect(utils.formatZentaoUrl("https://demo.zentao.net/")).toBe("https://demo.zentao.net/");
    expect(utils.formatZentaoUrl("https://demo.zentao.net")).toBe("https://demo.zentao.net/");
    expect(utils.formatZentaoUrl("demo.zentao.net")).toBe("http://demo.zentao.net/");
    expect(utils.formatZentaoUrl("demo.zentao.net/")).toBe("http://demo.zentao.net/");
    expect(utils.formatZentaoUrl("http://demo.zentao.net/index.php")).toBe(
      "http://demo.zentao.net/",
    );
    expect(utils.formatZentaoUrl("https://demo.zentao.net/index.php")).toBe(
      "https://demo.zentao.net/",
    );
    expect(utils.formatZentaoUrl("demo.zentao.net/index.php")).toBe("http://demo.zentao.net/");
  });
});

describe("utils.slimmingObject", () => {
  it("slimmingObject", () => {
    expect(utils.slimmingObject({ a: 1, b: null, c: "3", d: true }, ["b", "c"])).toStrictEqual({
      b: null,
      c: "3",
    });
    expect(
      utils.slimmingObject({ a: 1, b: null, c: "3", d: true }, ["a", "b", "c", "d"]),
    ).toStrictEqual({ a: 1, b: null, c: "3", d: true });
    expect(utils.slimmingObject({ a: 1, b: null, c: "3", d: true }, [])).toStrictEqual({});
    expect(utils.slimmingObject(undefined, ["b", "c"])).toBe(undefined);
    expect(utils.slimmingObject(null, ["b", "c"])).toBe(null);
  });
});

describe("utils.normalizeRequestParams", () => {
  expect(utils.normalizeRequestParams({ foo: "bar", hello: "world" })).toStrictEqual([
    ["foo", "bar"],
    ["hello", "world"],
  ]);
  expect(utils.normalizeRequestParams("answer=42")).toStrictEqual([["answer", "42"]]);
  expect(utils.normalizeRequestParams("foo=bar&answer=42")).toStrictEqual([
    ["answer", "42"],
    ["foo", "bar"],
  ]);
  expect(
    utils.normalizeRequestParams([
      ["foo", "ter"],
      ["say", "hi"],
    ]),
  ).toStrictEqual([
    ["foo", "ter"],
    ["say", "hi"],
  ]);
  expect(utils.normalizeRequestParams([])).toStrictEqual([]);
  expect(utils.normalizeRequestParams()).toStrictEqual([]);
});

describe("utils.mergeRequestParams", () => {
  const params1 = { foo: "bar", hello: "world" };
  const params2 = "answer=42";
  const params3 = [
    ["foo", "ter"],
    ["say", "hi"],
  ];

  expect(utils.mergeRequestParams(params1, params2)).toStrictEqual([
    ["foo", "bar"],
    ["hello", "world"],
    ["answer", "42"],
  ]);
  expect(utils.mergeRequestParams(params1, params2, params3)).toStrictEqual([
    ["foo", ["bar", "ter"]],
    ["hello", "world"],
    ["answer", "42"],
    ["say", "hi"],
  ]);
});
