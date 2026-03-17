package com.back.standard.util;

public class Ut {

  public static String f(String format, Object... args) {
    return format.formatted(args);
  }
}
