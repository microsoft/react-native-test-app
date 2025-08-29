export const simple = {
  $schema:
    "https://raw.githubusercontent.com/microsoft/react-native-test-app/trunk/schema.json",
  name: "Example",
  displayName: "Template",
  version: "1.0",
  bundleRoot: "main",
  singleApp: "single",
  components: [
    {
      appKey: "Example",
    },
    {
      appKey: "Example",
      displayName: "Template",
      initialProperties: {},
      presentationStyle: "modal",
      slug: "single",
    },
  ],
  resources: ["dist/res", "dist/main.jsbundle"],
};

export const minimum = { name: "Example" };

export const extended = {
  name: "Example",
  components: [
    {
      appKey: "Example",
      initialProperties: {
        boolean: true,
        double: 1.1,
        int: 1,
        null: null,
        string: "string",
        array: [
          true,
          1.1,
          1,
          null,
          "string",
          [
            true,
            1.1,
            1,
            null,
            "string",
            [],
            {
              boolean: true,
              double: 1.1,
              int: 1,
              null: null,
              string: "string",
            },
          ],
          {
            boolean: true,
            double: 1.1,
            int: 1,
            null: null,
            string: "string",
          },
        ],
        object: {
          boolean: true,
          double: 1.1,
          int: 1,
          null: null,
          string: "string",
          array: [
            true,
            1.1,
            1,
            null,
            "string",
            [
              true,
              1.1,
              1,
              null,
              "string",
              [],
              {
                boolean: true,
                double: 1.1,
                int: 1,
                null: null,
                string: "string",
              },
            ],
            {},
          ],
          object: {
            boolean: true,
            double: 1.1,
            int: 1,
            null: null,
            string: "string",
            array: [
              true,
              1.1,
              1,
              null,
              "string",
              [
                true,
                1.1,
                1,
                null,
                "string",
                [],
                {
                  boolean: true,
                  double: 1.1,
                  int: 1,
                  null: null,
                  string: "string",
                },
              ],
              {
                boolean: true,
                double: 1.1,
                int: 1,
                null: null,
                string: "string",
              },
            ],
          },
        },
      },
    },
  ],
  resources: ["dist/res", "dist/main.jsbundle"],
};
