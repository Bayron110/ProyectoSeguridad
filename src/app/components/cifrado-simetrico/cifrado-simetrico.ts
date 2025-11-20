import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as openpgp from 'openpgp';

@Component({
  selector: 'app-cifrado-simetrico',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './cifrado-simetrico.html',
  styleUrl: './cifrado-simetrico.css'
})
export class CifradoSimetricoComponent {

  modoTexto = true;
  texto = '';
  passPhrase = '';
  mensaje = '';
  resultado = '';
  selectedFile: File | null = null;
  fileInfo = '';

  activarTexto() { this.modoTexto = true; }
  activarArchivo() { this.modoTexto = false; }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile) {
      this.fileInfo = `Archivo: ${this.selectedFile.name} — ${(this.selectedFile.size / 1024).toFixed(2)} KB`;
    }
  }

  // ---------------------------------------------
  // CIFRAR TEXTO O ARCHIVO (OPENPGP.js)
  // ---------------------------------------------
  async cifrar() {
    if (!this.passPhrase) return this.error("Ingresa contraseña");

    try {
      if (this.modoTexto) {

        const encrypted = await openpgp.encrypt({
          message: await openpgp.createMessage({ text: this.texto }),
          passwords: [this.passPhrase],
          format: "armored"
        });

        this.resultado = encrypted;
        this.texto = encrypted;
        this.mensaje = "Texto cifrado compatible con Kleopatra (.asc)";

      } else if (this.selectedFile) {

        const fileArray = new Uint8Array(await this.selectedFile.arrayBuffer());

        const encrypted = await openpgp.encrypt({
          message: await openpgp.createMessage({ binary: fileArray }),
          passwords: [this.passPhrase],
          format: "binary"
        });

        const blob = new Blob([encrypted]);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = this.selectedFile.name + ".gpg";
        a.click();

        this.mensaje = "Archivo cifrado compatible con Kleopatra (.gpg)";
      }

    } catch (e: any) {
      this.error("Error al cifrar: " + e.message);
    }
  }

  // ---------------------------------------------
  // DESCIFRAR TEXTO O ARCHIVO (OPENPGP.js)
  // ---------------------------------------------
  async descifrar() {
    if (!this.passPhrase) return this.error("Ingresa contraseña");

    try {
      if (this.modoTexto) {

        const message = await openpgp.readMessage({ armoredMessage: this.texto });

        const { data: decrypted } = await openpgp.decrypt({
          message,
          passwords: [this.passPhrase]
        });

        this.resultado = decrypted;
        this.texto = decrypted;
        this.mensaje = "Texto descifrado correctamente";

      } else if (this.selectedFile) {

        const fileArray = new Uint8Array(await this.selectedFile.arrayBuffer());

        const message = await openpgp.readMessage({ binaryMessage: fileArray });

        const { data: decrypted } = await openpgp.decrypt({
          message,
          passwords: [this.passPhrase],
          format: "binary"
        });

        const blob = new Blob([decrypted]);
        const a = document.createElement("a");
        const filename = this.selectedFile.name.replace('.gpg', '');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();

        this.mensaje = "Archivo descifrado correctamente";
      }

    } catch (e: any) {
      this.error("Contraseña incorrecta o archivo no válido.");
    }
  }

  error(msg: string) { this.mensaje = msg; }
}
