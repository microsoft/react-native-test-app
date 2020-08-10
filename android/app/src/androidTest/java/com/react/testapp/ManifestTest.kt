package com.react.testapp

import com.react.testapp.manifest.Manifest
import com.react.testapp.manifest.ManifestJsonAdapter
import com.react.testapp.manifest.MoshiBundleAdapter
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test

class ManifestTest {
    private lateinit var adapter: JsonAdapter<Manifest>

    @Before
    fun setUp() {
        adapter = ManifestJsonAdapter(
            Moshi.Builder()
                .add(MoshiBundleAdapter())
                .build()
        )
    }

    @Test
    fun parsesMultipleComponentsWithProps() {
        val json = """
            {
              "name": "Example",
              "displayName": "Example",
              "components": [
                {
                  "appKey": "Example",
                  "displayName": "App",
                  "initialProperties": { "prop_1": "value_1" }
                },
                {
                  "appKey": "Example2",
                  "displayName": "App2",
                  "initialProperties": { "prop_2": "value_2" }
                }
              ]
            }
        """

        val manifest = adapter.fromJson(json)
        assertNotNull(manifest)

        manifest?.apply {
            assertEquals(2, components.size)

            val componentOne = components[0]
            assertEquals("Example", componentOne.appKey)
            assertEquals("App", componentOne.displayName)

            val propsOne = componentOne.initialProperties
            assertNotNull(propsOne)
            assertEquals("value_1", propsOne?.get("prop_1").toString())

            val componentTwo = components[1]
            assertEquals("Example2", componentTwo.appKey)
            assertEquals("App2", componentTwo.displayName)

            val propsTwo = componentTwo.initialProperties
            assertNotNull(propsTwo)
            assertEquals("value_2", propsTwo?.get("prop_2").toString())
        }
    }
}
