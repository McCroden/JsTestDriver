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
package com.google.jstestdriver;

import com.google.jstestdriver.JsTestDriverClientTest.FakeResponseStream;

import junit.framework.TestCase;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/**
 * @author jeremiele@google.com (Jeremie Lenfant-Engelmann)
 */
public class CommandTaskTest extends TestCase {

  public void testConvertJsonResponseToObject() throws Exception {
    MockServer server = new MockServer();

    server.expect("http://localhost/heartbeat?id=1", "OK");
    server.expect("http://localhost/fileSet?POST?{id=1, fileSet=[]}", "");
    server.expect("http://localhost/cmd?POST?{data={mooh}, id=1}", "");
    server.expect("http://localhost/cmd?id=1", "{\"response\":{\"response\":\"response\"," +
    		"\"browser\":{\"name\":\"browser\"},\"error\":\"error\",\"executionTime\":123}," +
    		"\"last\":true}");
    Map<String, String> params = new LinkedHashMap<String, String>();

    params.put("data", "{mooh}");
    params.put("id", "1");
    FakeResponseStream stream = new FakeResponseStream();
    CommandTask task = new CommandTask(new JsTestDriverFileFilter() {
      public String filterFile(String content, boolean reload) {
        return content;
      }

      public Set<String> resolveFilesDeps(String file) {
        Set<String> set = new LinkedHashSet<String>();

        set.add(file);
        return set;
      }
    }, stream, new LinkedHashSet<FileInfo>(), "http://localhost", server, params);

    task.run();
    Response response = stream.getResponse();

    assertEquals("response", response.getResponse());
    assertEquals("browser", response.getBrowser().getName());
    assertEquals("error", response.getError());
    assertEquals(123L, response.getExecutionTime());
  }
}
