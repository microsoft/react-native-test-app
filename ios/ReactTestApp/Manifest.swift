//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

import Foundation

struct Component: Decodable {
    let appKey: String
    let displayName: String?
    let initialProperties: [AnyHashable: Any]?

    private enum Keys: String, CodingKey {
        case appKey
        case displayName
        case initialProperties
    }

    init(appKey: String, displayName: String?, initialProperties: [AnyHashable: Any]?) {
        self.appKey = appKey
        self.displayName = displayName
        self.initialProperties = initialProperties
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: Keys.self)
        appKey = try container.decode(String.self, forKey: .appKey)
        displayName = try container.decodeIfPresent(String.self, forKey: .displayName)
        initialProperties = {
            guard let decoder = try? container.superDecoder(forKey: .initialProperties) else {
                return nil
            }
            return try? [AnyHashable: Any].decode(from: decoder)
        }()
    }
}

struct Manifest: Decodable {
    let name: String
    let displayName: String
    let components: [Component]

    static func fromFile() -> Manifest? {
        guard let manifestURL = Bundle.main.url(forResource: "app", withExtension: "json"),
              let data = try? Data(contentsOf: manifestURL, options: .uncached)
        else {
            return nil
        }
        return from(data: data)
    }

    static func from(data: Data) -> Manifest? {
        try? JSONDecoder().decode(self, from: data)
    }
}

private struct DynamicCodingKey: CodingKey {
    private(set) var stringValue: String

    init?(stringValue: String) {
        self.stringValue = stringValue
    }

    private(set) var intValue: Int?

    init?(intValue: Int) {
        self.init(stringValue: "")
        self.intValue = intValue
    }

    func toHashable() -> AnyHashable {
        guard let intValue = intValue else {
            return stringValue
        }
        return intValue
    }
}

extension Array where Element == Any {
    static func decode(from decoder: Decoder) throws -> Array? {
        guard var container = try? decoder.unkeyedContainer() else {
            return nil
        }

        var array: [Any] = []
        while !container.isAtEnd {
            if let isNull = try? container.decodeNil(), isNull {
                array.append(NSNull())
            } else if let boolean = try? container.decode(Bool.self) {
                array.append(boolean)
            } else if let double = try? container.decode(Double.self) {
                array.append(double)
            } else if let string = try? container.decode(String.self) {
                array.append(string)
            } else if let superDecoder = try? container.superDecoder() {
                if let innerArray = try? Array.decode(from: superDecoder) {
                    array.append(innerArray)
                } else if let object = try? Dictionary.decode(from: superDecoder) {
                    array.append(object)
                }
            }
        }
        return array
    }
}

extension Dictionary where Key == AnyHashable, Value == Any {
    static func decode(from decoder: Decoder) throws -> Dictionary? {
        guard let container = try? decoder.container(keyedBy: DynamicCodingKey.self) else {
            return nil
        }

        var dictionary: [AnyHashable: Any] = [:]
        for key in container.allKeys {
            if let isNull = try? container.decodeNil(forKey: key), isNull {
                dictionary[key.toHashable()] = NSNull()
            } else if let boolean = try? container.decode(Bool.self, forKey: key) {
                dictionary[key.toHashable()] = boolean
            } else if let double = try? container.decode(Double.self, forKey: key) {
                dictionary[key.toHashable()] = double
            } else if let string = try? container.decode(String.self, forKey: key) {
                dictionary[key.toHashable()] = string
            } else if let array = try? Array.decode(from: container.superDecoder(forKey: key)) {
                dictionary[key.toHashable()] = array
            } else if let object = try? Dictionary.decode(from: container.superDecoder(forKey: key)) {
                dictionary[key.toHashable()] = object
            }
        }
        return dictionary
    }
}
