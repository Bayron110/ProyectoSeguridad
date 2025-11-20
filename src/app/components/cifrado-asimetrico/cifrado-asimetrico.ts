import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as openpgp from 'openpgp';

@Component({
  selector: 'app-cifrado-hibrido',
  templateUrl: './cifrado-asimetrico.html',
  styleUrls: ['./cifrado-asimetrico.css'],
  imports: [FormsModule],
  standalone: true
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

  // ---------------------------------------------------------
  // 🔑 GENERAR CLAVES PGP COMPATIBLES CON KLEOPATRA
  // ---------------------------------------------------------
  async generarClavesRSA() {
    const { privateKey, publicKey } = await openpgp.generateKey({
      type: 'rsa',
      rsaBits: 2048,
      userIDs: [{ name: "Usuario Angular", email: "test@example.com" }]
    });

    this.clavePublicaPEM = publicKey;
    this.clavePrivadaPEM = privateKey;

    this.mensaje = "🔐 Claves PGP generadas correctamente (compatibles con Kleopatra).";
  }

  // ---------------------------------------------------------
  // SUBIR ARCHIVO 
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // 🔒 CIFRAR ARCHIVO (OpenPGP compatible con Kleopatra)
  // ---------------------------------------------------------
  async cifrarArchivo() {
    try {
      if (!this.archivoSeleccionado) {
        this.mensaje = "⚠️ Seleccione un archivo primero.";
        return;
      }

      const fileBuffer = await this.archivoSeleccionado.arrayBuffer();

      const publicKey = await openpgp.readKey({ armoredKey: this.clavePublicaPEM });

      const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ binary: new Uint8Array(fileBuffer) }),
        encryptionKeys: publicKey,
        format: "binary"
      });

      const blob = new Blob([encrypted], { type: "application/pgp-encrypted" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = this.archivoSeleccionado.name + ".pgp";
      link.click();

      this.mensaje = "✅ Archivo cifrado (formato .pgp compatible con Kleopatra).";
    } catch (error) {
      console.error(error);
      this.mensaje = "❌ Error al cifrar el archivo.";
    }
  }

  // ---------------------------------------------------------
  // 🔓 DESCIFRAR ARCHIVO (OpenPGP compatible con Kleopatra)
  // ---------------------------------------------------------
  async descifrarArchivo() {
    try {
      if (!this.archivoSeleccionado) {
        this.mensaje = "⚠️ Seleccione un archivo .pgp para descifrar.";
        return;
      }

      const armoredPrivateKey = this.clavePrivadaPEM;
      const privateKey = await openpgp.readPrivateKey({ armoredKey: armoredPrivateKey });

      const encryptedBytes = new Uint8Array(await this.archivoSeleccionado.arrayBuffer());
      const message = await openpgp.readMessage({ binaryMessage: encryptedBytes });

      const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey,
        format: "binary"
      });

      const blob = new Blob([decrypted], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = this.archivoSeleccionado.name.replace(/\.pgp$/i, "");
      link.click();

      this.mensaje = "✅ Archivo descifrado correctamente.";
    } catch (error) {
      console.error(error);
      this.mensaje = "❌ Error al descifrar. Verifique la clave privada.";
    }
  }

  // ---------------------------------------------------------
  // 🔒 CIFRAR TEXTO (OpenPGP)
  // ---------------------------------------------------------
  async cifrarTexto() {
    try {
      if (!this.textoClaro.trim()) {
        this.mensaje = "⚠️ Ingrese un texto.";
        return;
      }

      const publicKey = await openpgp.readKey({ armoredKey: this.clavePublicaPEM });

      const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: this.textoClaro }),
        encryptionKeys: publicKey
      });

      this.textoCifrado = encrypted;
      this.mensaje = "✅ Texto cifrado correctamente (PGP ASCII).";
    } catch (error) {
      console.error(error);
      this.mensaje = "❌ Error al cifrar texto.";
    }
  }

  // ---------------------------------------------------------
  // 🔓 DESCIFRAR TEXTO (OpenPGP)
  // ---------------------------------------------------------
  async descifrarTexto() {
    try {
      const privateKey = await openpgp.readPrivateKey({ armoredKey: this.clavePrivadaPEM });

      const message = await openpgp.readMessage({ armoredMessage: this.textoCifrado });

      const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey
      });

      this.textoDescifrado = decrypted;
      this.mensaje = "✅ Texto descifrado correctamente.";
    } catch (error) {
      console.error(error);
      this.mensaje = "❌ Error al descifrar el texto.";
    }
  }

  // ---------------------------------------------------------
  // DESCARGAR / SUBIR CLAVE PRIVADA
  // ---------------------------------------------------------
  descargarClavePrivada() {
    const blob = new Blob([this.clavePrivadaPEM], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = "clave_privada.asc";
    link.click();
  }

  async cargarClavePrivada(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const text = await input.files[0].text();
      this.clavePrivadaPEM = text;
      this.mensaje = "🔐 Clave privada cargada.";
    } else {
      this.mensaje = "⚠️ No se seleccionó archivo.";
    }
  }

  // ---------------------------------------------------------
  // DESCARGAR TEXTO CIFRADO
  // ---------------------------------------------------------
  descargarTextoCifrado() {
    const blob = new Blob([this.textoCifrado], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "texto_cifrado.asc";
    link.click();
  }

  async cargarTextoCifrado(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.textoCifrado = (await input.files[0].text()).trim();
      this.mensaje = "📤 Texto cifrado cargado.";
    } else {
      this.mensaje = "⚠️ No se seleccionó archivo.";
    }
  }
}
