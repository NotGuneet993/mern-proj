import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = "http://10.0.2.2:5001"; // or local IP if using physical device

  static Future<http.Response> login(String email, String password) async {
    final url = Uri.parse('$baseUrl/users/login');

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    return response;
  }

  static Future<http.Response> fetchSchedule(String userId) async {
    final url = Uri.parse('$baseUrl/schedule/get/$userId');

    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );

    return response;
  }
}