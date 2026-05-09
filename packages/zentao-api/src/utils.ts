import CryptoJS from "crypto-js";
import querystring from "querystring";
import { ZentaoRequestParamPair, ZentaoRequestParams } from "./types";

export const md5 = (value: string): string => CryptoJS.MD5(value).toString();

/**
 * 格式化禅道地址
 * @param url 禅道地址
 * @returns 格式化后的禅道地址
 * @example
 * // 以下例子都返回 `http://demo.zentao.net/`
 * formatZentaoUrl('http://demo.zentao.net');
 * formatZentaoUrl('http://demo.zentao.net');
 * formatZentaoUrl('http://demo.zentao.net/index.php');
 * formatZentaoUrl('demo.zentao.net');
 */
export function formatZentaoUrl(url: string) {
  if (url.endsWith("/index.php")) {
    url = url.substr(0, url.length - 9);
  } else if (!url.endsWith("/")) {
    url = `${url}/`;
  }
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    url = `http://${url}`;
  }
  return url;
}

/**
 * 创建一个新的对象，仅保留给定的原始对象上给定的属性
 * @param object 给定的原始对象
 * @param fields 要保留属性名称列表
 * @returns 新的对象
 * @example
 * const obj = {a: 1, b: 2, c: 3, d: 4};
 * slimmingObject(obj, ['b', 'c']); // 返回 `{b: 2, c: 3}`
 */
export function slimmingObject(object: any, fields: string[]): any {
  if (!object || typeof object !== "object" || object === null) {
    return object;
  }
  const newObject: Record<string, any> = {};
  for (const field of fields) {
    newObject[field] = object[field];
  }
  return newObject;
}

/**
 * 格式化请求参数定义
 * @param params 要格式化的参数定义
 * @returns 格式化后的参数列表
 * @example
 * // 下面返回：`[['foo', 'bar'], ['hello', 'world']]`
 * normalizeRequestParams([['foo', 'bar'], ['hello', 'world']]);
 *
 * // 下面返回：`[['foo', 'bar'], ['hello', 'world']]`
 * normalizeRequestParams('foo=bar&hello=world');
 *
 * // 下面返回：`[['foo', 'bar'], ['hello', 'world']]`
 * normalizeRequestParams({foo: 'bar', hello: 'world'});
 *
 * // 下面返回：`[['', 'bar'], ['', 'world']]`
 * normalizeRequestParams(['foo', 'bar']);
 *
 * // 下面返回：`[['foo', 'bar'], ['', 'world']]`
 * normalizeRequestParams([['foo', 'bar'], 'bar']);
 */
export function normalizeRequestParams(params?: ZentaoRequestParams): ZentaoRequestParamPair[] {
  const normalizedParams: ZentaoRequestParamPair[] = [];
  if (typeof params === "string") {
    params = querystring.parse(params);
  }
  if (params && typeof params === "object") {
    if (Array.isArray(params)) {
      for (const param of params) {
        normalizedParams.push(typeof param === "string" ? ["", param] : param);
      }
    } else if (params as Record<string, any>) {
      for (const key of Object.keys(params).sort()) {
        normalizedParams.push([key, params[key]]);
      }
    }
  }
  return normalizedParams;
}

/**
 * 合并两个请求参数定义，并返回合并且格式化后的定义
 * @param params 参数定义
 * @param otherParams 要合并的其他参数定义
 * @returns 合并后的参数列表
 * @example
 * const params1 = {foo: 'bar', hello: 'world'};
 * const params2 = 'answer='42'';
 * const params3 = [['foo', 'ter'], ['say', 'hi']];
 *
 * // 以下返回 `[['foo', 'bar'], ['answer', '42']]`
 * mergeRequestParams(params1, params2);
 *
 * // 以下返回 `[['foo', ['bar', 'ter']], ['answer', '42'], ['hello', 'world'], ['say', 'hi']]`
 * mergeRequestParams(params1, params2, params3);
 */
export function mergeRequestParams(
  params: ZentaoRequestParams,
  ...otherParams: ZentaoRequestParams[]
): ZentaoRequestParamPair[] {
  const normalizedParams = normalizeRequestParams(params);
  for (const otherParam of otherParams) {
    const otherNormalizedParams = normalizeRequestParams(otherParam);
    for (const param of otherNormalizedParams) {
      if (typeof param[0] === "string" && param[0].length) {
        const existsParam = normalizedParams.find((x) => x[0] === param[0]);
        if (existsParam) {
          if (Array.isArray(existsParam[1])) {
            existsParam[1].push(param[1]);
          } else {
            existsParam[1] = [existsParam[1], param[1]];
          }
          continue;
        }
      }
      normalizedParams.push(param);
    }
  }
  return normalizedParams;
}
