package com.microsoft.reacttestapp

import android.os.Bundle
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.microsoft.reacttestapp.manifest.Manifest
import com.microsoft.reacttestapp.manifest.ManifestJsonAdapter
import com.microsoft.reacttestapp.manifest.MoshiBundleAdapter
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.MockedConstruction
import org.mockito.MockedStatic
import org.mockito.Mockito
import org.mockito.junit.MockitoJUnitRunner

@RunWith(MockitoJUnitRunner::class)
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

        useMocks {
            val manifest = adapter.fromJson(json)
            assertNotNull(manifest)

            manifest?.apply {
                val components = components ?: listOf()
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

    private fun mockArguments(): MockedStatic<Arguments> {
        val mockedArguments = Mockito.mockStatic(Arguments::class.java)
        mockedArguments
            .`when`<WritableArray> { Arguments.createArray() }
            .thenReturn(JavaOnlyArray())
        mockedArguments
            .`when`<WritableMap> { Arguments.createMap() }
            .thenReturn(JavaOnlyMap())
        mockedArguments
            .`when`<Bundle> { Arguments.toBundle(Mockito.any()) }
            .thenAnswer { it.callRealMethod() }
        return mockedArguments
    }

    private fun mockBundle(): MockedConstruction<Bundle> {
        val map = HashMap<String, Any>()
        return Mockito.mockConstruction(Bundle::class.java) { mock, _ ->
            Mockito.doAnswer { map[it.getArgument(0)] }.`when`(mock).get(Mockito.anyString())

            Mockito.doAnswer {
                val key = it.getArgument<String>(0)
                val value = it.getArgument<Any>(1)
                map[key] = value
                null
            }.`when`(mock).putString(Mockito.anyString(), Mockito.any())

            Mockito.doAnswer { map.toString() }.`when`(mock).toString()
        }
    }

    private fun useMocks(test: () -> Unit) {
        mockBundle().use {
            mockArguments().use {
                test()
            }
        }
    }
}
