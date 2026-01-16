# Reload environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Install Node.js 20 using nvm
Write-Host "Installing Node.js 20 LTS..."
nvm install 20.18.2
nvm use 20.18.2

# Verify installation
Write-Host "Checking Node.js version..."
node --version
npm --version

Write-Host "Node.js 20 is now active!"
