/* eslint-disable @typescript-eslint/no-explicit-any */
// src/global.d.ts

// Importa os tipos originais que queremos estender
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// Aumenta a definição do módulo 'jspdf'
declare module 'jspdf' {
  // Adiciona a assinatura do método 'autoTable' à interface jsPDF
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Declara as bibliotecas que são carregadas globalmente na janela do navegador
declare global {
  interface Window {
    jsPDF: {
      jsPDF: typeof jsPDF;
    };
    XLSX: typeof XLSX;
  }
}

// Garante que este arquivo seja tratado como um módulo
export {};
