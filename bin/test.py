import subprocess

from flask import Flask, jsonify, request

app = Flask(__name__)


@app.route("/bshell", methods=["POST"])
def run_script():
    # Run the external Python script
    script_output = subprocess.check_output(["python", "driver.py"])
    return jsonify({"output": script_output.decode("utf-8")})


if __name__ == "__main__":
    app.run(port=5005)
