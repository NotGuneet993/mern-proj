// main.dart
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:mobile/screens/loginScreen.dart';

Future<void> main() async {
  // Make sure to load your .env for API_URL, etc.
  await dotenv.load(fileName: ".env");
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KnightNav',
      home: LoginScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}