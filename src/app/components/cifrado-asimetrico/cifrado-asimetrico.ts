import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-cifrado-hibrido',
  templateUrl: './cifrado-asimetrico.html',
  imports: [FormsModule],
  styleUrls: ['./cifrado-asimetrico.css']
})
export class CifradoAsimetricoComponent {

  archivoSeleccionado: File | null = null;
  clavePublicaPEM: string = '';
  clavePrivadaPEM: string = '';
  mensaje: string = '';
  textoClaro: string = '';
  textoCifrado: string = '';
  textoDescifrado: string = '';

  constructor() {
    this.generarClavesRSA();
  }

  async generarClavesRSA() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      true,
      ["encrypt", "decrypt"]
    );

    const pubKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    this.clavePublicaPEM = this.arrayBufferToPem(pubKey, "PUBLIC KEY");
    this.clavePrivadaPEM = this.arrayBufferToPem(privKey, "PRIVATE KEY");
  }

  arrayBufferToPem(buffer: ArrayBuffer, label: string): string {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const formatted = base64.match(/.{1,64}/g)?.join('\n') ?? '';
    return `-----BEGIN ${label}-----\n${formatted}\n-----END ${label}-----`;
  }

  pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    const binary = atob(b64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer.buffer;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivoSeleccionado = input.files[0];
      this.mensaje = `Archivo seleccionado: ${this.archivoSeleccionado.name}`;
    } else {
      this.archivoSeleccionado = null;
      this.mensaje = "No se seleccionó ningún archivo.";
    }
  }

  async cifrarArchivo() {
    try {
      if (!this.archivoSeleccionado) {
        this.mensaje = "⚠️ Seleccione un archivo primero.";
        return;
      }

      const arrayBuffer = await this.archivoSeleccionado.arrayBuffer();
      const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(arrayBuffer));


      const claveAES = CryptoJS.lib.WordArray.random(32);
      const iv = CryptoJS.lib.WordArray.random(16);


      const archivoCifrado = CryptoJS.AES.encrypt(wordArray, claveAES, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).ciphertext;


      const pubKey = await window.crypto.subtle.importKey(
        "spki",
        this.pemToArrayBuffer(this.clavePublicaPEM),
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
      );

      const claveAESBytes = new Uint8Array(claveAES.sigBytes);
      for (let i = 0; i < claveAES.sigBytes; i++) {
        claveAESBytes[i] = claveAES.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8) & 0xff;
      }

      const claveAESCifrada = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        pubKey,
        claveAESBytes
      );


      const ivBytes = new Uint8Array(iv.sigBytes);
      for (let i = 0; i < iv.sigBytes; i++) {
        ivBytes[i] = iv.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8) & 0xff;
      }

      const archivoBytes = new Uint8Array(archivoCifrado.sigBytes);
      for (let i = 0; i < archivoCifrado.sigBytes; i++) {
        archivoBytes[i] = archivoCifrado.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8) & 0xff;
      }

      const paquete = new Uint8Array(
        claveAESCifrada.byteLength + ivBytes.length + archivoBytes.length
      );
      paquete.set(new Uint8Array(claveAESCifrada), 0);
      paquete.set(ivBytes, claveAESCifrada.byteLength);
      paquete.set(archivoBytes, claveAESCifrada.byteLength + ivBytes.length);

      const blob = new Blob([paquete], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = this.archivoSeleccionado.name + ".cifrado";
      link.click();

      this.mensaje = "✅ Archivo cifrado con esquema híbrido RSA + AES.";
    } catch (error) {
      console.error("Error al cifrar:", error);
      this.mensaje = "❌ Error al cifrar el archivo.";
    }
  }
  async descifrarArchivo() {
    try {
      if (!this.archivoSeleccionado) {
        this.mensaje = "⚠️ Seleccione un archivo .hibrido para descifrar.";
        return;
      }

      const buffer = await this.archivoSeleccionado.arrayBuffer();
      const total = new Uint8Array(buffer);


      const claveAESCifrada = total.slice(0, 256);
      const ivBytes = total.slice(256, 272);
      const archivoCifrado = total.slice(272);


      const privKey = await window.crypto.subtle.importKey(
        "pkcs8",
        this.pemToArrayBuffer(this.clavePrivadaPEM),
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"]
      );

      // 🔓 Descifrar clave AES
      const claveAESBuffer = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privKey,
        claveAESCifrada
      );

      const claveAES = CryptoJS.lib.WordArray.create(new Uint8Array(claveAESBuffer));
      const iv = CryptoJS.lib.WordArray.create(ivBytes);
      const ciphertext = CryptoJS.lib.WordArray.create(archivoCifrado);

      // 🔓 Descifrar archivo con AES
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: ciphertext
      });

      const decrypted = CryptoJS.AES.decrypt(
        cipherParams,
        claveAES,
        { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
      );

      const byteArray = new Uint8Array(decrypted.sigBytes);
      for (let i = 0; i < decrypted.sigBytes; i++) {
        byteArray[i] = decrypted.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8) & 0xff;
      }

      const blob = new Blob([byteArray], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = this.archivoSeleccionado.name.replace(/\.Cifrado$/, '');
      link.click();

      this.mensaje = "✅ Archivo descifrado correctamente.";
    } catch (error) {
      console.error("Error al descifrar:", error);
      this.mensaje = "❌ Error al descifrar el archivo. Verifique la clave privada.";
    }
  }
  descargarClavePrivada() {
    const blob = new Blob([this.clavePrivadaPEM], { type: 'application/x-pem-file' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clave_privada.pem';
    link.click();
  }
  async cargarClavePrivada(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const archivo = input.files[0];
      const texto = await archivo.text();
      this.clavePrivadaPEM = texto;
      this.mensaje = "🔐 Clave privada cargada correctamente.";
    } else {
      this.mensaje = "⚠️ No se seleccionó ningún archivo.";
    }
  }
  async cifrarTexto() {
  try {
    if (!this.textoClaro.trim()) {
      this.mensaje = "⚠️ Ingrese un texto para cifrar.";
      return;
    }

    const claveAES = CryptoJS.lib.WordArray.random(32);
    const iv = CryptoJS.lib.WordArray.random(16);

    const cifrado = CryptoJS.AES.encrypt(this.textoClaro, claveAES, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).ciphertext;

    const pubKey = await window.crypto.subtle.importKey(
      "spki",
      this.pemToArrayBuffer(this.clavePublicaPEM),
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );

    const claveAESBytes = new Uint8Array(claveAES.sigBytes);
    for (let i = 0; i < claveAES.sigBytes; i++) {
      claveAESBytes[i] = claveAES.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8) & 0xff;
    }

    const claveAESCifrada = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      pubKey,
      claveAESBytes
    );

    const ivBytes = new Uint8Array(iv.sigBytes);
    for (let i = 0; i < iv.sigBytes; i++) {
      ivBytes[i] = iv.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8) & 0xff;
    }

    const archivoBytes = new Uint8Array(cifrado.sigBytes);
    for (let i = 0; i < cifrado.sigBytes; i++) {
      archivoBytes[i] = cifrado.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8) & 0xff;
    }

    const paquete = new Uint8Array(
      claveAESCifrada.byteLength + ivBytes.length + archivoBytes.length
    );
    paquete.set(new Uint8Array(claveAESCifrada), 0);
    paquete.set(ivBytes, claveAESCifrada.byteLength);
    paquete.set(archivoBytes, claveAESCifrada.byteLength + ivBytes.length);

    this.textoCifrado = btoa(String.fromCharCode(...paquete));
    this.mensaje = "✅ Texto cifrado correctamente.";
  } catch (error) {
    console.error("Error al cifrar texto:", error);
    this.mensaje = "❌ Error al cifrar el texto.";
  }
}

async descifrarTexto() {
  try {
    if (!this.textoCifrado.trim()) {
      this.mensaje = "⚠️ Ingrese un texto cifrado en base64.";
      return;
    }

    const paquete = Uint8Array.from(atob(this.textoCifrado), c => c.charCodeAt(0));
    const claveAESCifrada = paquete.slice(0, 256);
    const ivBytes = paquete.slice(256, 272);
    const textoCifradoBytes = paquete.slice(272);

    const privKey = await window.crypto.subtle.importKey(
      "pkcs8",
      this.pemToArrayBuffer(this.clavePrivadaPEM),
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"]
    );

    const claveAESBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privKey,
      claveAESCifrada
    );

    const claveAES = CryptoJS.lib.WordArray.create(new Uint8Array(claveAESBuffer));
    const iv = CryptoJS.lib.WordArray.create(ivBytes);
    const ciphertext = CryptoJS.lib.WordArray.create(textoCifradoBytes);

    const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
    const decrypted = CryptoJS.AES.decrypt(cipherParams, claveAES, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    this.textoDescifrado = decrypted.toString(CryptoJS.enc.Utf8);
    this.mensaje = "✅ Texto descifrado correctamente.";
  } catch (error) {
    console.error("Error al descifrar texto:", error);
    this.mensaje = "❌ Error al descifrar el texto.";
  }
}
descargarTextoCifrado() {
  if (!this.textoCifrado.trim()) {
    this.mensaje = "⚠️ No hay texto cifrado para descargar.";
    return;
  }

  const blob = new Blob([this.textoCifrado], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'texto_cifrado.txt';
  link.click();

  this.mensaje = "📥 Texto cifrado descargado como archivo .txt.";
}
async cargarTextoCifrado(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const archivo = input.files[0];
    const contenido = await archivo.text();
    this.textoCifrado = contenido.trim();
    this.mensaje = "📤 Texto cifrado cargado correctamente.";
  } else {
    this.mensaje = "⚠️ No se seleccionó ningún archivo.";
  }
}

}