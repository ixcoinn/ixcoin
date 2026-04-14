# BrewHelper.cmake - Helper untuk menemukan paket Homebrew di macOS
# Hanya relevan di macOS, diabaikan di Linux/Windows

macro(find_brew_prefix _var _pkg)
  if(APPLE)
    find_program(BREW brew)
    if(BREW)
      execute_process(
        COMMAND ${BREW} --prefix ${_pkg}
        OUTPUT_VARIABLE ${_var}
        OUTPUT_STRIP_TRAILING_WHITESPACE
        ERROR_QUIET
      )
    endif()
  endif()
endmacro()
