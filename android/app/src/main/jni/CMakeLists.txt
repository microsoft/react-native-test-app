cmake_minimum_required(VERSION 3.13)

project(reacttestapp_appmodules)

set(REACTTESTAPP_ROOT ../../../../..)
set(REACTTESTAPP_SOURCE_FILES
  ${REACTTESTAPP_ROOT}/common/AppRegistry.cpp
  ${REACTTESTAPP_ROOT}/common/AppRegistry.h
  AppRegistry.cpp
  AppRegistry.h
)

# Suppress 'Manually-specified variables were not used by the project' warning
set(UNUSED_VARIABLES
  ${NODE_MODULES_DIR}         # TODO: No longer used in 0.72
  ${REACT_ANDROID_BUILD_DIR}  # TODO: No longer used in 0.72
  ${REACT_COMMON_DIR}
  ${REACT_JNILIBS_DIR}
)

if(DEFINED REACT_ANDROID_DIR)
  # New architecture
  include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)
  target_sources(${PROJECT_NAME} PRIVATE ${REACTTESTAPP_SOURCE_FILES})
else()
  # On old architecture, use prefabs if they can be found. Otherwise, look for
  # the `libjsi.so` we extracted from the `.aar`.
  add_library(${PROJECT_NAME} SHARED ${REACTTESTAPP_SOURCE_FILES})
  find_package(ReactAndroid CONFIG)
  if(ReactAndroid_FOUND)
    target_link_libraries(${PROJECT_NAME} ReactAndroid::jsi)
  else()
    if(CMAKE_BUILD_TYPE STREQUAL "Debug")
      set(BUILD_VARIANT debug)
    else()
      set(BUILD_VARIANT release)
    endif()
    set(JSI_LIBRARY ${REACT_JNILIBS_DIR}/${BUILD_VARIANT}/jni/${ANDROID_ABI}/libjsi.so)
    if(EXISTS ${JSI_LIBRARY})
      target_include_directories(${PROJECT_NAME} PRIVATE ${REACT_COMMON_DIR}/jsi)
      target_link_libraries(${PROJECT_NAME} ${JSI_LIBRARY})
    endif()
  endif()
endif()

target_include_directories(${PROJECT_NAME} PRIVATE ${REACTTESTAPP_ROOT})
