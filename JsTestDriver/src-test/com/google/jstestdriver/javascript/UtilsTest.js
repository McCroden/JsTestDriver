/*
 * Copyright 2009 Google Inc.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
var utilsTest = jstestdriver.testCaseManager.TestCase('utilsTest');

utilsTest.prototype.testStringFormat = function() {
  assertEquals("Hello world", jstestdriver.formatString("Hello %s", "world"));
  assertEquals("Hello 1", jstestdriver.formatString("Hello %d", 1));
  assertEquals("Hello world, number 1 and number 2 a float 1.5 ahah",
      jstestdriver.formatString("Hello %s, number %d and number %i a float %f", "world", 1, 2, 1.5,
      " ahah"));
  assertEquals("Hello world 42", jstestdriver.formatString("Hello", " world ", 42));
  assertEquals("Hello undefined", jstestdriver.formatString("Hello %s"));
  assertEquals("Hello {\"property\":\"value\"}", jstestdriver.formatString("Hello %s", {property:
    'value'}));
  assertEquals("Hello {\"property\":\"value\"}", jstestdriver.formatString("Hello ", {property:
    'value'}));
};
