// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * @author Nicholas C. Zakas
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Toru Nagashima
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "disallow the use of `process.exit()`",
      recommended: false,
      url: "https://github.com/eslint-community/eslint-plugin-n/blob/16.3.1/docs/rules/no-process-exit.md",
    },
    fixable: null,
    schema: [],
    messages: {
      noProcessExit: "Don't use process.exit(); throw an error instead.",
    },
  },

  create(context) {
    return {
      "CallExpression > MemberExpression.callee[object.name = 'process'][property.name = 'exit']"(
        node
      ) {
        context.report({
          node: node.parent,
          messageId: "noProcessExit",
        });
      },
    };
  },
};
