'use client';

import React from 'react';
import { FileText, FileCheck, ArrowRight, DollarSign, Scale } from 'lucide-react';
import Link from 'next/link';

export default function QuoteLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900">Sales Documents</h1>
            <p className="mt-1 text-neutral-500">Generate quotes and agreements for clients</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Cost Quotation Card */}
          <Link
            href="/quote/cost"
            className="group bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 hover:shadow-lg hover:border-violet-300 transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-neutral-900 group-hover:text-violet-700 transition-colors">
                  Cost Quotation
                </h2>
                <p className="mt-2 text-neutral-600">
                  Generate a professional pricing proposal for myRA AI platform subscription.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                Multi-tier pricing options
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                Consulting hours included
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                Payment terms customization
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                2-page professional PDF
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-violet-600 font-medium group-hover:gap-3 transition-all">
              Create Quote
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* MSA Card */}
          <Link
            href="/quote/msa"
            className="group bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 hover:shadow-lg hover:border-violet-300 transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Scale className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-neutral-900 group-hover:text-indigo-700 transition-colors">
                  Master Services Agreement
                </h2>
                <p className="mt-2 text-neutral-600">
                  Generate a legally-binding MSA with embedded order form and SLA.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                26 legal sections + SLA annexure
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Auto-suggested jurisdiction
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Embedded subscription order form
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                18-page comprehensive document
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-indigo-600 font-medium group-hover:gap-3 transition-all">
              Create MSA
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Workflow hint */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-white rounded-full shadow-sm border border-neutral-200">
            <span className="text-sm text-neutral-500">Typical workflow:</span>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">1. Quote</span>
              <ArrowRight className="w-4 h-4 text-neutral-400" />
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">2. MSA</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
