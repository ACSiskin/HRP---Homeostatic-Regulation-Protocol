import os
import sys
import subprocess
import shutil
import time
import platform
import getpass

# --- Configuration ---
ENV_EXAMPLE_FILE = "example.env.example"
ENV_FILE = ".env"
USE_SHELL = os.name == 'nt'

def print_logo():
    logo = """
    ██╗  ██╗██████╗ ██████╗ 
    ██║  ██║██╔══██╗██╔══██╗
    ███████║██████╔╝██████╔╝
    ██╔══██║██╔══██╗██╔═══╝ 
    ██║  ██║██║  ██║██║     
    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     
                            
  =========================================
  =    HOMEOSTATIC REGULATION PROTOCOL    =
  =       MIND_OS v1.0 CORE SETUP         =
  =========================================
    """
    print(logo)
    
    disclaimer = """
  [!] IMPORTANT DISCLAIMER: 
  MIND_OS v1.0 is a foundational R&D environment, NOT a commercial product.
  This software is governed by a strict custom license restricting it to 
  personal, internal, and non-commercial research purposes ONLY.
    """
    print(disclaimer)

def confirm_installation():
    response = input("\nDo you acknowledge the R&D license and wish to proceed with the installation? [y/N]: ").strip().lower()
    if response not in ['y', 'yes']:
        print("\n[X] Installation aborted by user. Please review the LICENSE file for more details.")
        sys.exit(0)

def print_step(msg):
    print(f"\n[*] {msg}")

def print_success(msg):
    print(f"[+] {msg}")

def print_warning(msg):
    print(f"[!] WARNING: {msg}")

def print_error(msg):
    print(f"[X] ERROR: {msg}")
    sys.exit(1)

def run_command(command, suppress_output=False):
    try:
        subprocess.run(
            command, 
            shell=USE_SHELL, 
            check=True, 
            stdout=subprocess.DEVNULL if suppress_output else None,
            stderr=subprocess.DEVNULL if suppress_output else None
        )
        return True
    except subprocess.CalledProcessError:
        return False

def install_nodejs():
    print_step("Node.js is missing. Attempting automated installation...")
    system = platform.system()
    
    if system == "Windows":
        print_step("Detected Windows. Attempting to install via winget...")
        if run_command(["winget", "install", "OpenJS.NodeJS", "--quiet"]):
            print_success("Node.js installed successfully.")
        else:
            print_error("Failed to auto-install Node.js. Please download it manually from https://nodejs.org/")
            
    elif system == "Darwin":
        print_step("Detected macOS. Attempting to install via Homebrew...")
        if run_command(["brew", "install", "node"]):
            print_success("Node.js installed successfully.")
        else:
            print_error("Failed to auto-install Node.js via brew. Please install it manually.")
            
    elif system == "Linux":
        print_step("Detected Linux. Attempting to install via apt...")
        run_command(["sudo", "apt-get", "update"])
        if run_command(["sudo", "apt-get", "install", "-y", "nodejs", "npm"]):
            print_success("Node.js installed successfully.")
        else:
            print_error("Failed to auto-install Node.js. Please install it manually.")
    else:
        print_error("Unsupported OS for automated Node.js installation. Please install manually.")

    print_warning("You may need to RESTART your terminal for the newly installed Node.js to be recognized.")
    print_warning("If the script fails in the next step, close this window, open a new one, and run 'python setup.py' again.")
    time.sleep(3)

def check_dependencies():
    print_step("Verifying system dependencies (Node.js & NPM)...")
    
    node_installed = shutil.which("node") is not None
    npm_installed = shutil.which("npm") is not None

    if not node_installed or not npm_installed:
        install_nodejs()
        if not shutil.which("node") or not shutil.which("npm"):
            print_error("Node.js installation completed, but binaries are not in PATH. Please restart your terminal and run this script again.")

    try:
        node_version = subprocess.run(["node", "-v"], capture_output=True, text=True, shell=USE_SHELL).stdout.strip()
        print_success(f"Node.js detected: {node_version}")
    except Exception:
        print_error("Failed to retrieve Node.js version.")

def install_npm_packages():
    print_step("Installing project dependencies (This may take a few minutes)...")
    if run_command(["npm", "install"]):
        print_success("NPM packages installed successfully.")
    else:
        print_error("Failed to install NPM packages.")

def setup_env():
    print_step("Configuring operational environment variables...")
    
    src_file = ENV_EXAMPLE_FILE if os.path.exists(ENV_EXAMPLE_FILE) else ".env.example"
    
    if not os.path.exists(ENV_FILE):
        if os.path.exists(src_file):
            shutil.copy(src_file, ENV_FILE)
            print_success(f"Created {ENV_FILE} from template.")
        else:
            print_warning(f"Could not find template '{src_file}'. Creating a new .env file.")
            with open(ENV_FILE, "w") as f:
                f.write('DATABASE_URL="file:./dev.db"\nOPENAI_API_KEY=\nGROK_API_KEY=\n')

    print("\n--- API KEYS CONFIGURATION ---")
    print("MIND_OS requires API keys to function autonomously.")
    openai_key = getpass.getpass("Enter your OPENAI_API_KEY (or press Enter to skip/keep existing): ").strip()
    grok_key = getpass.getpass("Enter your GROK_API_KEY (or press Enter to skip/keep existing): ").strip()

    # Read current .env
    with open(ENV_FILE, "r") as f:
        lines = f.readlines()

    # Write updated .env
    with open(ENV_FILE, "w") as f:
        for line in lines:
            if line.startswith("OPENAI_API_KEY=") and openai_key:
                f.write(f"OPENAI_API_KEY={openai_key}\n")
            elif line.startswith("GROK_API_KEY=") and grok_key:
                f.write(f"GROK_API_KEY={grok_key}\n")
            else:
                f.write(line)
                
    print_success("Environment variables saved.")

def setup_prisma_db():
    print_step("Initializing MIND_OS Database (Prisma ORM & SQLite)...")
    
    if not os.path.exists("prisma/schema.prisma") and not os.path.exists("schema.prisma"):
         print_warning("Database schema file (schema.prisma) not found. Skipping DB setup.")
         return

    print("--> Generating Prisma Client...")
    if run_command(["npx", "prisma", "generate"]):
        print_success("Prisma Client generated.")
    else:
        print_error("Failed to generate Prisma Client.")

    print("--> Pushing schema to SQLite database...")
    if run_command(["npx", "prisma", "db", "push"]):
        print_success("Database schema pushed successfully. Database is ready.")
    else:
        print_error("Failed to push schema to the database.")

def seed_database():
    print_step("Synchronizing local entities with the database...")
    if not os.path.exists("prisma/seed.js"):
         print_warning("Seed script (prisma/seed.js) not found. Skipping entity synchronization.")
         return

    print("--> Executing seed script...")
    if run_command(["node", "prisma/seed.js"]):
        print_success("Entities synchronized successfully.")
    else:
        print_warning("Failed to synchronize entities. You may need to add them manually via UI.")

def finish():
    print_step("Installation Sequence Complete!")
    summary = """
  =========================================
  MIND_OS is fully configured and ready.
  
  To awaken the system, run the following 
  command in your terminal:
  
      npm run dev
      
  Control Interface: http://localhost:3000
  =========================================
    """
    print(summary)

if __name__ == "__main__":
    try:
        print_logo()
        time.sleep(1)
        confirm_installation()
        check_dependencies()
        install_npm_packages()
        setup_env()
        setup_prisma_db()
        seed_database()
        finish()
    except KeyboardInterrupt:
        print("\n[X] Installation aborted by user.")
        sys.exit(0)
