cmake_minimum_required(VERSION 3.14)
project(aura_climate LANGUAGES CXX)

set(BINARY_NAME "aura_climate")

cmake_policy(SET CMP0079 NEW)

# Configure build options
get_property(IS_MULTICONFIG GLOBAL PROPERTY GENERATOR_IS_MULTI_CONFIG)
if(IS_MULTICONFIG)
  set(CMAKE_CONFIGURATION_TYPES "Debug;Profile;Release"
    CACHE STRING "" FORCE)
else()
  if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_BUILD_TYPE "Debug" CACHE
      STRING "Configuration type" FORCE)
    set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS
      "Debug" "Profile" "Release")
  endif()
endif()

# Installation logic
set(CMAKE_INSTALL_PREFIX "${CMAKE_CURRENT_BINARY_DIR}/runner" CACHE PATH "..." FORCE)

add_subdirectory(flutter)
add_subdirectory(runner)
