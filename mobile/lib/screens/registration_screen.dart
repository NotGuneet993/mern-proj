import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class RegistrationScreen extends StatefulWidget {
  const RegistrationScreen({super.key});
  final API_URL = "https://knightnav.net";

  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  final nameController = TextEditingController();
  final emailController = TextEditingController();
  final usernameController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();

  // Regular expressions for validation.
  final RegExp emailRegExp =
      RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$'); // Basic email pattern.
  final RegExp passwordRegExp =
      RegExp(r'^(?=.*[A-Z])(?=.*[!@#\$%^&*]).+$'); // At least one uppercase and one special character.

  // Holds error messages for display.
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    // Listen to changes and validate in real time.
    emailController.addListener(_checkValidations);
    passwordController.addListener(_checkValidations);
    confirmPasswordController.addListener(_checkValidations);
  }

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    usernameController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  // Displays a dialog with the provided title and message.
  void _showMessageDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          )
        ],
      ),
    );
  }

  // Checks all validations and updates the error message.
  void _checkValidations() {
    String message = '';
    final email = emailController.text;
    final password = passwordController.text;
    final confirmPassword = confirmPasswordController.text;

    if (email.isNotEmpty && !emailRegExp.hasMatch(email)) {
      message += 'Invalid email address. ';
    }
    if (password.isNotEmpty && !passwordRegExp.hasMatch(password)) {
      message += 'Password must include at least one uppercase letter and one special character. ';
    }
    if (password.isNotEmpty &&
        confirmPassword.isNotEmpty &&
        password != confirmPassword) {
      message += 'Passwords do not match.';
    }

    setState(() {
      _errorMessage = message;
    });
  }

  // Handles the registration process with an HTTP POST.
  Future<void> handleRegistration() async {
    // Final check before submission.
    if (_errorMessage.isNotEmpty) {
      _showMessageDialog(
          "Validation Error", "Please fix the errors before registering.");
      return;
    }

    final name = nameController.text;
    final email = emailController.text;
    final username = usernameController.text;
    final password = passwordController.text;
    final url = '${widget.API_URL}/api/users/register';

    print(
        "Registering with Name: $name, Email: $email, Username: $username, Password: $password");

    try {
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': name,
          'email': email,
          'username': username,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        _showMessageDialog("Success", "Registration successful!");
      } 
      else if (response.statusCode == 409){
        _showMessageDialog("Error", "Email already associated with an account!");
      }
      else {
        _showMessageDialog(
            "Error", "Registration failed with status code: ${response.statusCode}");
      }
    } catch (error) {
      print("Error during registration: $error");
      _showMessageDialog("Error", "An error occurred during registration.");
    }
  }

  @override
  Widget build(BuildContext context) {
    // Check if form is valid.
    bool isFormValid = emailRegExp.hasMatch(emailController.text) &&
        passwordRegExp.hasMatch(passwordController.text) &&
        (passwordController.text == confirmPasswordController.text) &&
        emailController.text.isNotEmpty &&
        passwordController.text.isNotEmpty;

    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: const Text("Register"),
        backgroundColor: const Color.fromARGB(255, 236, 220, 39),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                "Create an Account",
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 32),

              // Name Input Field.
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: "Name",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),

              // Email Input Field.
              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: "Email",
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),

              // Username Input Field.
              TextField(
                controller: usernameController,
                decoration: const InputDecoration(
                  labelText: "Username",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),

              // Password Input Field.
              TextField(
                controller: passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: "Password",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),

              // Confirm Password Input Field.
              TextField(
                controller: confirmPasswordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: "Confirm Password",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),

              // Red error message text, shown if validations fail.
              if (_errorMessage.isNotEmpty)
                Text(
                  _errorMessage,
                  style: const TextStyle(color: Colors.red),
                ),
              const SizedBox(height: 24),

              // Registration Button.
              ElevatedButton(
                onPressed: isFormValid ? handleRegistration : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color.fromARGB(255, 236, 220, 39),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 40, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  "Register",
                  style: TextStyle(fontSize: 16, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
