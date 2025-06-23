import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Result "mo:base/Result";
import MiMC "../src/crypto/MiMC";

actor MiMCTest {
    // Test vectors from gnark-crypto
    private let testVectors = [
        {
            name = "Test 1: Hash single value 123456789";
            input = "00000000000000000000000000000000000000000000000000000000075bcd15";
            expected = "07e7a78b7f7c7c74c5892c8ba4a3fb5d5280bf5809e817193ef247bbd7b3e9ac";
        },
        {
            name = "Test 2: Hash nullifier 987654321";
            input = "000000000000000000000000000000000000000000000000000000003ade68b1";
            expected = "1c40adadec88e4f79650d1e0c908a92bf687083f8c4fbcefb8dd78d2b88d73e8";
        },
        {
            name = "Test 3: Hash zero";
            input = "0000000000000000000000000000000000000000000000000000000000000000";
            expected = "2c7298fd87d3039ffea208538f6b297b60b373a63792b4cd0654fdc88fd0d6ee";
        }
    ];
    
    private let testVectorsPair = [
        {
            name = "Test 4: Hash two values (111111, 222222)";
            left = "00000000000000000000000000000000000000000000000000000000000001b207";
            right = "0000000000000000000000000000000000000000000000000000000000003640e";
            expected = "11bfa56316c1d7a204b63de7923b8e11fd5ac9a15845e90950ef361199dca0aa";
        }
    ];
    
    private let testVectorsTriple = [
        {
            name = "Test 5: Commitment (123456789, 987654321, 1ETH)";
            a = "00000000000000000000000000000000000000000000000000000000075bcd15"; // secret
            b = "000000000000000000000000000000000000000000000000000000003ade68b1"; // nullifier
            c = "0000000000000000000000000000000000000000000000000de0b6b3a7640000"; // amount (1 ETH)
            expected = "1a2402f2f07432890eba9eef679f5536da65f789323e9a99fca0d4db1637145d";
        }
    ];
    
    // Run all tests
    public func runTests() : async Text {
        var results = "=== MiMC Test Results ===\n\n";
        var passed = 0;
        var failed = 0;
        
        // Test single value hashing
        results #= "Single Value Hash Tests:\n";
        for (test in testVectors.vals()) {
            switch (MiMC.hexToBlob(test.input)) {
                case (?inputBlob) {
                    let output = MiMC.hashOne(inputBlob);
                    let outputHex = MiMC.blobToHex(output);
                    // Remove 0x prefix for comparison
                    let cleanOutput = Text.replace(outputHex, #text "0x", "");
                    
                    if (cleanOutput == test.expected) {
                        results #= "✅ " # test.name # " PASSED\n";
                        passed += 1;
                    } else {
                        results #= "❌ " # test.name # " FAILED\n";
                        results #= "   Expected: " # test.expected # "\n";
                        results #= "   Got:      " # cleanOutput # "\n";
                        failed += 1;
                    };
                };
                case null {
                    results #= "❌ " # test.name # " FAILED (invalid hex input)\n";
                    failed += 1;
                };
            };
        };
        
        results #= "\nPair Hash Tests:\n";
        // Test pair hashing
        for (test in testVectorsPair.vals()) {
            switch (MiMC.hexToBlob(test.left), MiMC.hexToBlob(test.right)) {
                case (?leftBlob, ?rightBlob) {
                    let output = MiMC.hashTwo(leftBlob, rightBlob);
                    let outputHex = MiMC.blobToHex(output);
                    let cleanOutput = Text.replace(outputHex, #text "0x", "");
                    
                    if (cleanOutput == test.expected) {
                        results #= "✅ " # test.name # " PASSED\n";
                        passed += 1;
                    } else {
                        results #= "❌ " # test.name # " FAILED\n";
                        results #= "   Expected: " # test.expected # "\n";
                        results #= "   Got:      " # cleanOutput # "\n";
                        failed += 1;
                    };
                };
                case _ {
                    results #= "❌ " # test.name # " FAILED (invalid hex input)\n";
                    failed += 1;
                };
            };
        };
        
        results #= "\nTriple Hash Tests:\n";
        // Test triple hashing
        for (test in testVectorsTriple.vals()) {
            switch (MiMC.hexToBlob(test.a), MiMC.hexToBlob(test.b), MiMC.hexToBlob(test.c)) {
                case (?aBlob, ?bBlob, ?cBlob) {
                    let output = MiMC.hashThree(aBlob, bBlob, cBlob);
                    let outputHex = MiMC.blobToHex(output);
                    let cleanOutput = Text.replace(outputHex, #text "0x", "");
                    
                    if (cleanOutput == test.expected) {
                        results #= "✅ " # test.name # " PASSED\n";
                        passed += 1;
                    } else {
                        results #= "❌ " # test.name # " FAILED\n";
                        results #= "   Expected: " # test.expected # "\n";
                        results #= "   Got:      " # cleanOutput # "\n";
                        failed += 1;
                    };
                };
                case _ {
                    results #= "❌ " # test.name # " FAILED (invalid hex input)\n";
                    failed += 1;
                };
            };
        };
        
        results #= "\n=== Summary ===\n";
        results #= "Passed: " # Nat.toText(passed) # "\n";
        results #= "Failed: " # Nat.toText(failed) # "\n";
        
        if (failed == 0) {
            results #= "\n🎉 All tests passed! MiMC implementation matches gnark-crypto!\n";
        } else {
            results #= "\n⚠️  Some tests failed. MiMC implementation needs fixes.\n";
        };
        
        results
    };
    
    // Test utility functions
    public func testHexConversion() : async Text {
        var results = "=== Hex Conversion Tests ===\n";
        
        // Test hex to blob
        let testHex = "0x075bcd15";
        switch (MiMC.hexToBlob(testHex)) {
            case (?blob) {
                let backToHex = MiMC.blobToHex(blob);
                results #= "Hex to blob to hex: " # testHex # " -> " # backToHex # "\n";
            };
            case null {
                results #= "Failed to convert hex to blob\n";
            };
        };
        
        results
    };
}