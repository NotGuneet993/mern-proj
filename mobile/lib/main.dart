import 'package:flutter/material.dart';
import 'screens/loginScreen.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

Future<void> main() async {
  await dotenv.load(fileName: ".env");
  runApp(MaterialApp(
    home: LoginScreen(),
  ));
}