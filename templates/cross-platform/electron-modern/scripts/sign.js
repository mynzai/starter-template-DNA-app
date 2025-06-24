const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Code signing script for cross-platform builds
 */
class CodeSigner {
  constructor() {
    this.platform = process.platform;
    this.isCI = !!process.env.CI;
  }

  async signApp(appPath, options = {}) {
    console.log(`Starting code signing for ${this.platform}...`);
    
    try {
      switch (this.platform) {
        case 'darwin':
          await this.signMacApp(appPath, options);
          break;
        case 'win32':
          await this.signWindowsApp(appPath, options);
          break;
        case 'linux':
          await this.signLinuxApp(appPath, options);
          break;
        default:
          console.warn(`Code signing not implemented for platform: ${this.platform}`);
      }
      
      console.log('✅ Code signing completed successfully');
    } catch (error) {
      console.error('❌ Code signing failed:', error);
      throw error;
    }
  }

  async signMacApp(appPath, options) {
    const identity = process.env.CSC_NAME || options.identity;
    const entitlements = options.entitlements || path.join(__dirname, '../build/entitlements.mac.plist');
    
    if (!identity) {
      console.warn('No signing identity found for macOS, skipping code signing');
      return;
    }

    console.log('Signing macOS app with identity:', identity);
    
    // Sign the app bundle
    const signCommand = [
      'codesign',
      '--force',
      '--verbose',
      '--deep',
      '--strict',
      '--timestamp',
      '--options', 'runtime',
      '--entitlements', entitlements,
      '--sign', `"${identity}"`,
      `"${appPath}"`
    ].join(' ');

    execSync(signCommand, { stdio: 'inherit' });
    
    // Verify the signature
    const verifyCommand = `codesign --verify --verbose=4 "${appPath}"`;
    execSync(verifyCommand, { stdio: 'inherit' });
    
    console.log('macOS app signed and verified successfully');
  }

  async signWindowsApp(appPath, options) {
    const certificatePath = process.env.CSC_LINK;
    const certificatePassword = process.env.CSC_KEY_PASSWORD;
    const timestampUrl = options.timestampUrl || 'http://timestamp.digicert.com';
    
    if (!certificatePath || !certificatePassword) {
      console.warn('No certificate found for Windows, skipping code signing');
      return;
    }

    console.log('Signing Windows app...');
    
    // Use signtool for Windows code signing
    const signCommand = [
      'signtool',
      'sign',
      '/f', `"${certificatePath}"`,
      '/p', `"${certificatePassword}"`,
      '/t', timestampUrl,
      '/v',
      `"${appPath}"`
    ].join(' ');

    try {
      execSync(signCommand, { stdio: 'inherit' });
    } catch (error) {
      // Fallback to PowerShell Set-AuthenticodeSignature if signtool is not available
      console.log('Falling back to PowerShell signing...');
      
      const powershellCommand = [
        'powershell',
        '-Command',
        `"$cert = Get-PfxCertificate -FilePath '${certificatePath}' -Password (ConvertTo-SecureString -String '${certificatePassword}' -AsPlainText -Force);`,
        `Set-AuthenticodeSignature -FilePath '${appPath}' -Certificate $cert -TimestampServer '${timestampUrl}'"`
      ].join(' ');
      
      execSync(powershellCommand, { stdio: 'inherit' });
    }
    
    // Verify the signature
    const verifyCommand = `powershell -Command "Get-AuthenticodeSignature '${appPath}'"`;
    execSync(verifyCommand, { stdio: 'inherit' });
    
    console.log('Windows app signed and verified successfully');
  }

  async signLinuxApp(appPath, options) {
    // Linux doesn't have a standard code signing mechanism like Windows/macOS
    // However, we can create checksums and GPG signatures
    
    const gpgKey = process.env.GPG_PRIVATE_KEY;
    const gpgPassphrase = process.env.GPG_PASSPHRASE;
    
    if (!gpgKey) {
      console.warn('No GPG key found for Linux, creating checksums only');
      await this.createChecksums(appPath);
      return;
    }

    console.log('Creating GPG signature for Linux app...');
    
    // Import GPG key
    const tempKeyFile = path.join(__dirname, 'temp-gpg-key.asc');
    fs.writeFileSync(tempKeyFile, gpgKey);
    
    try {
      execSync(`gpg --import "${tempKeyFile}"`, { stdio: 'inherit' });
      
      // Create detached signature
      const signCommand = gpgPassphrase 
        ? `echo "${gpgPassphrase}" | gpg --batch --yes --passphrase-fd 0 --detach-sign "${appPath}"`
        : `gpg --detach-sign "${appPath}"`;
      
      execSync(signCommand, { stdio: 'inherit' });
      
      // Create checksums
      await this.createChecksums(appPath);
      
      console.log('Linux app signed and checksums created');
    } finally {
      // Clean up temp key file
      if (fs.existsSync(tempKeyFile)) {
        fs.unlinkSync(tempKeyFile);
      }
    }
  }

  async createChecksums(appPath) {
    console.log('Creating checksums...');
    
    const checksumFile = `${appPath}.checksums.txt`;
    
    // Create SHA256 checksum
    const sha256Command = this.platform === 'darwin' || this.platform === 'linux'
      ? `shasum -a 256 "${appPath}" > "${checksumFile}"`
      : `powershell -Command "Get-FileHash '${appPath}' -Algorithm SHA256 | Format-List > '${checksumFile}'"`;
    
    execSync(sha256Command, { stdio: 'inherit' });
    
    // Create MD5 checksum (for compatibility)
    const md5File = `${appPath}.md5`;
    const md5Command = this.platform === 'darwin' || this.platform === 'linux'
      ? `md5sum "${appPath}" > "${md5File}"`
      : `powershell -Command "Get-FileHash '${appPath}' -Algorithm MD5 | Format-List > '${md5File}'"`;
    
    execSync(md5Command, { stdio: 'inherit' });
    
    console.log('Checksums created successfully');
  }

  async verifySignature(appPath) {
    console.log('Verifying signature...');
    
    try {
      switch (this.platform) {
        case 'darwin':
          execSync(`codesign --verify --verbose=4 "${appPath}"`, { stdio: 'inherit' });
          execSync(`spctl --assess --verbose=4 "${appPath}"`, { stdio: 'inherit' });
          break;
        case 'win32':
          execSync(`powershell -Command "Get-AuthenticodeSignature '${appPath}'"`, { stdio: 'inherit' });
          break;
        case 'linux':
          if (fs.existsSync(`${appPath}.sig`)) {
            execSync(`gpg --verify "${appPath}.sig" "${appPath}"`, { stdio: 'inherit' });
          }
          break;
      }
      
      console.log('✅ Signature verification successful');
      return true;
    } catch (error) {
      console.error('❌ Signature verification failed:', error);
      return false;
    }
  }
}

// Export for use in build scripts
module.exports = CodeSigner;

// Allow direct execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node sign.js <app-path> [options]');
    console.error('Options:');
    console.error('  --identity <identity>     macOS signing identity');
    console.error('  --entitlements <path>     macOS entitlements file');
    console.error('  --timestamp <url>         Windows timestamp server');
    console.error('  --verify                  Verify signature after signing');
    process.exit(1);
  }
  
  const appPath = path.resolve(args[0]);
  const options = {};
  
  // Parse options
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--identity':
        options.identity = args[++i];
        break;
      case '--entitlements':
        options.entitlements = path.resolve(args[++i]);
        break;
      case '--timestamp':
        options.timestampUrl = args[++i];
        break;
      case '--verify':
        options.verify = true;
        break;
    }
  }
  
  const signer = new CodeSigner();
  
  signer.signApp(appPath, options)
    .then(async () => {
      if (options.verify) {
        await signer.verifySignature(appPath);
      }
      console.log('Code signing script completed successfully');
    })
    .catch((error) => {
      console.error('Code signing script failed:', error);
      process.exit(1);
    });
}