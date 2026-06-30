import { useState } from 'react'
import SqlInputPanel from './components/SqlInputPanel'
import ExampleQueryPanel from './components/ExampleQueryPanel'
import OutputPanel from './components/OutputPanel'
import { translate } from './core/translator'
import examples from './data/examples.ts'
import './styles/layout.css'

export default function App() {
  const [sqlText, setSqlText] = useState('')
  const [result, setResult] = useState<any>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  const handleSubmit = (text: string) => {
    setIsTranslating(true)
    try {
      const r = translate(text)
      setResult(r)
      setValidationMessage(r.errors && r.errors.length > 0 ? r.errors[0].message : null)
    } finally {
      setIsTranslating(false)
    }
  }

  const handleSelectExample = (sql: string) => {
    setSqlText(sql)
    handleSubmit(sql)
  }

  return (
    <div className="app-grid">
      <aside className="left-col">
        <ExampleQueryPanel examples={examples} onSelect={handleSelectExample} />
        <SqlInputPanel sqlText={sqlText} setSqlText={setSqlText} onSubmit={handleSubmit} isTranslating={isTranslating} validationMessage={validationMessage} />
      </aside>
      <main className="right-col">
        <OutputPanel result={result} />
      </main>
    </div>
  )
}
