#!/usr/bin/env python3
"""
DorkForge CLI Tool.
Terminal interface for generating, validating, and permuting Google Dorks.
Powered by Rich & Questionary for an elite experience.
"""

import argparse
import sys
import os
import time
from typing import List, Dict, Optional
from pathlib import Path

# UI Libraries
try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.markdown import Markdown
    from rich import print as rprint
    import questionary
except ImportError:
    print("Error: Required libraries (rich, questionary) not found.")
    print("Please run: pip install rich questionary")
    sys.exit(1)

# Add project root to path
sys.path.append(str(Path(__file__).parent))

try:
    from dorkforge.core.dork import Dork
    from dorkforge.core.validator import DorkValidator
    from dorkforge.core.permutator import DorkPermutator
    from dorkforge.core.engine import DorkEngine
    from dorkforge.ai import get_ai_provider, get_supported_providers
    from dorkforge.export import get_exporter
except ImportError as e:
    console = Console()
    console.print(f"[bold red]Error importing DorkForge components:[/bold red] {e}")
    sys.exit(1)

console = Console()

class DorkForgeCLI:
    def __init__(self):
        self.validator = DorkValidator()
        self.permutator = DorkPermutator()
        self.engine = DorkEngine()

    def print_banner(self):
        """Print the application banner."""
        console.print(Panel.fit(
            "[bold cyan]🔍 DorkForge[/bold cyan] [dim]v2.0[/dim]\n"
            "[white]Advanced Google Hacking Tool[/white]",
            border_style="cyan"
        ))

    def _print_command_help(self, command: str, usage: str, examples: List[str]):
        """Helper to print consistent help screens."""
        rprint(f"\n[bold yellow]ℹ️  Usage Guide: {command}[/bold yellow]")
        rprint(f"[dim]{usage}[/dim]\n")
        
        rprint("[bold]Examples:[/bold]")
        for ex in examples:
            rprint(f"  [green]$ python3 cli.py {ex}[/green]")
        rprint("")

    def handle_generate(self, args):
        """Handle template-based generation."""
        # Help Screen if missing category
        if not args.category and not args.list_categories:
            # 1. Show Categories Table
            categories = self.engine.list_categories()
            table = Table(title="Available Categories", border_style="green", header_style="bold green")
            table.add_column("Category ID", style="cyan", no_wrap=True)
            table.add_column("Description", style="white")
            table.add_column("Dork Count", justify="right", style="magenta")

            for cat in categories:
                info = self.engine.get_category_info(cat)
                table.add_row(cat, info['description'], str(info['template_count']))
            console.print(table)

            # 2. Show Help
            self._print_command_help(
                "generate",
                "Generate dorks from pre-defined templates.",
                [
                    "generate -c admin_panels -d example.com",
                    "generate -c sensitive_files -d target.com -k password",
                    "generate --list-categories"
                ]
            )
            return

        if args.list_categories:
            # Already handled above logically if we just want list, but to be safe:
            if not args.category: return 

        # Generate logic
        params = {}
        if args.domain:
            params['domain'] = args.domain
            params['domain_name'] = args.domain
        if args.keyword:
            params['keyword'] = args.keyword

        try:
            with console.status(f"[bold green]Generating dorks for {args.category}...[/bold green]"):
                dorks = self.engine.generate_from_template(args.category, params)
            
            self._display_results(dorks)
            self._handle_export(dorks)

        except Exception as e:
            console.print(f"[bold red]Error:[/bold red] {str(e)}")

    def handle_ai(self, args):
        """Handle AI generation."""
        
        # Help Screen if missing inputs
        if not args.prompt and not args.list_providers:
            # 1. List Providers
            supported = get_supported_providers()
            table = Table(title="Supported AI Providers", border_style="blue", header_style="bold blue")
            table.add_column("Provider ID", style="cyan")
            table.add_column("Env Var Required", style="yellow")
            
            env_map = {
                'openai': 'OPENAI_API_KEY',
                'gemini': 'GOOGLE_API_KEY',
                'claude': 'ANTHROPIC_API_KEY',
                'groq': 'GROQ_API_KEY',
                'mistral': 'MISTRAL_API_KEY',
                'deepseek': 'DEEPSEEK_API_KEY',
                'ollama': 'None (Localhost)'
            }

            for p in supported:
                table.add_row(p, env_map.get(p, "Unknown"))
            console.print(table)

            # 2. Show Help
            self._print_command_help(
                "ai",
                "Generate custom dorks using Generative AI.",
                [
                    "ai \"Find login pages for admin\" -p openai",
                    "ai \"Exposed env files\" -p groq -d example.com",
                    "ai \"S3 buckets\" -p ollama -m llama3"
                ]
            )
            return
            
        if args.list_providers:
            return # Table shown above logic would be duplicate if we didn't split flow. 
            # Actually simplest is: if list_only, return.
            # But here logic is: if NOTHING provided, show help.

        try:
            with console.status(f"[bold purple]Thinking ({args.provider})...[/bold purple]"):
                provider = get_ai_provider(args.provider, model=args.model)
                
                if not provider.is_available():
                    console.print(f"[bold red]Error:[/bold red] Provider '{args.provider}' is not configured/available.")
                    rprint("[yellow]Tip: Check your .env file or run 'python3 cli.py builder' to configure.[/yellow]")
                    return

                context = {}
                if args.domain: context['domain'] = args.domain

                dork_raw = provider.generate_dork(args.prompt, context)
            
            # Clean up response
            dork = dork_raw.replace("```", "").strip()
            
            console.print(Panel(dork, title="✨ AI Generated Dork", border_style="purple"))
            
            # Validation
            is_valid = self.validator.validate_syntax(dork)
            if is_valid:
                console.print("[bold green]✓ Syntax Valid[/bold green]")
            else:
                console.print("[bold red]⚠ Syntax Invalid[/bold red]")
                errors = self.validator.detect_common_errors(dork)
                for err in errors:
                    console.print(f"  [red]- {err}[/red]")

            # Handle Export
            ai_dork = Dork(
                query=dork,
                category="ai_generated",
                description=f"AI Prompt: {args.prompt}",
                source="ai"
            )
            self._handle_export([ai_dork])

        except Exception as e:
             console.print(f"[bold red]AI Error:[/bold red] {str(e)}")

    def handle_builder(self, args):
        """Interactive Dork Builder (Questionary)."""
        rprint("\n[bold cyan]🛠  Interactive Dork Builder[/bold cyan]")
        rprint("[dim]Select an option using arrow keys and Enter[/dim]\n")
        
        # Step 1: Choose Mode
        mode = questionary.select(
            "What would you like to do?",
            choices=[
                questionary.Choice("Generate from Template", value="template"),
                questionary.Choice("Build Custom Dork", value="custom"),
                questionary.Choice("AI Generation", value="ai"),
                questionary.Choice("Exit", value="exit")
            ]
        ).ask()

        if not mode or mode == "exit": return

        if mode == "template":
            categories = self.engine.list_categories()
            cat = questionary.select(
                "Select a Category:",
                choices=categories
            ).ask()
            
            if not cat: return

            domain = questionary.text("Target Domain (optional, e.g. example.com):").ask()
            keyword = questionary.text("Keyword (optional):").ask()
            
            args.category = cat
            args.domain = domain if domain else None
            args.keyword = keyword if keyword else None
            args.list_categories = False
            self.handle_generate(args)

        elif mode == "ai":
            prompt = questionary.text("Describe what you want to find:").ask()
            if not prompt: return

            providers = get_supported_providers()
            provider = questionary.select(
                "Select AI Provider:",
                choices=providers,
                default="openai"
            ).ask()
            
            domain = questionary.text("Target Context (optional domain):").ask()
            
            args.prompt = prompt
            args.provider = provider
            args.domain = domain if domain else None
            args.model = None
            args.list_providers = False
            self.handle_ai(args)
            
        elif mode == "custom":
            # Visual Builder Logic
            operators = []
            
            while True:
                # Show current dork preview
                current_dork = " ".join(operators) if operators else "(empty)"
                rprint(f"\n[bold]Current Dork:[/bold] [green]{current_dork}[/green]\n")

                op_choice = questionary.select(
                    "Add an operator or finish:",
                    choices=[
                        questionary.Choice("site: (Target Domain)", value="site"),
                        questionary.Choice("inurl: (URL contains text)", value="inurl"),
                        questionary.Choice("intitle: (Page Title contains)", value="intitle"),
                        questionary.Choice("intext: (Page Text contains)", value="intext"),
                        questionary.Choice("filetype: (File Extension)", value="filetype"),
                        questionary.Choice("ext: (File Extension - Alias)", value="ext"),
                        questionary.Choice("cache: (Cached version)", value="cache"),
                        questionary.Choice("Undo Last", value="undo"),
                        questionary.Choice("Clear All", value="clear"),
                        questionary.Choice("Finish & Copy", value="finish"),
                        questionary.Choice("Cancel", value="cancel")
                    ]
                ).ask()
                
                if not op_choice or op_choice == "cancel": return
                
                if op_choice == "finish":
                    if not operators:
                        rprint("[yellow]Dork is empty![/yellow]")
                        continue
                    full_dork = " ".join(operators)
                    console.print(Panel(full_dork, title="Final Dork", border_style="green"))
                    return
                
                if op_choice == "undo":
                    if operators: operators.pop()
                    continue
                    
                if op_choice == "clear":
                    operators = []
                    continue

                # Add value for operator
                val = questionary.text(f"Value for {op_choice}:").ask()
                if val:
                    val = val.strip('"\'')
                    if " " in val:
                        val = f'"{val}"'
                    operators.append(f'{op_choice}:{val}')


    def handle_validate(self, args):
        """Validate logic."""
        if not args.query:
             self._print_command_help(
                "validate",
                "Check if a Google Dork has valid syntax.",
                [
                    "validate \"site:example.com inurl:admin\"",
                    "validate \"filetype:pdf secret\""
                ]
            )
             return

        is_valid = self.validator.validate_syntax(args.query)
        if is_valid:
            console.print(Panel(f"[green]{args.query}[/green]", title="Status: VALID", border_style="green"))
            exp = self.validator.explain_dork(args.query)
            console.print(f"[dim]{exp}[/dim]")
        else:
            console.print(Panel(f"[red]{args.query}[/red]", title="Status: INVALID", border_style="red"))
            errors = self.validator.detect_common_errors(args.query)
            if errors:
                console.print("[bold]Errors:[/bold]")
                for err in errors:
                    console.print(f" - [red]{err}[/red]")

    def handle_permute(self, args):
        """Permutation logic."""
        if not args.query:
             self._print_command_help(
                "permute",
                "Generate variations of a specific dork query.",
                [
                    "permute \"site:gov filetype:pdf\"",
                    "permute \"inurl:login\""
                ]
            )
             return

        variations = self.permutator.get_variations(args.query)
        dorks = [Dork(v, "permutation", "Variation") for v in variations]
        self._display_results(dorks)
        self._handle_export(dorks)


    def _display_results(self, dorks: List[Dork]):
        """Helper to print dork results formatted."""
        if not dorks:
            console.print("[yellow]No dorks generated.[/yellow]")
            return

        console.print(f"\n[bold green]Generated {len(dorks)} Dorks:[/bold green]\n")
        
        for i, dork in enumerate(dorks, 1):
            console.print(f"[cyan]{i}.[/cyan] {dork.query}")
            if dork.description:
                console.print(f"   [dim]└─ {dork.description}[/dim]")
            print()

    def _handle_export(self, dorks: List[Dork]):
        """Prompt and handle exporting dorks to file."""
        if not dorks:
            return

        should_export = questionary.confirm(
            "Would you like to export these results?",
            default=False
        ).ask()

        if not should_export:
            return

        fmt = questionary.select(
            "Select export format:",
            choices=["txt", "json", "csv"]
        ).ask()

        if not fmt:
            return

        filename = questionary.text(
            f"Enter filename (default: dorks.{fmt}):",
            default=f"dorks.{fmt}"
        ).ask()

        if not filename:
            filename = f"dorks.{fmt}"

        try:
            exporter = get_exporter(fmt)
            # Metadata for export
            metadata = {
                "count": len(dorks),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            exporter.export_to_file(dorks, filename, metadata)
            console.print(f"[bold green]✓ Successfully exported to {filename}[/bold green]")
        except Exception as e:
            console.print(f"[bold red]Export Error:[/bold red] {str(e)}")

def main():
    parser = argparse.ArgumentParser(description="DorkForge CLI")
    subparsers = parser.add_subparsers(dest='command', help='Command to run')

    # Generate
    parser_gen = subparsers.add_parser('generate', help='Generate from templates')
    # Made optional to show help if missing
    parser_gen.add_argument('-c', '--category', help='Category ID (run without args to list)', required=False)
    parser_gen.add_argument('-d', '--domain', help='Target domain')
    parser_gen.add_argument('-k', '--keyword', help='Keyword to insert')
    parser_gen.add_argument('--list-categories', action='store_true', help='List available categories')

    # AI
    parser_ai = subparsers.add_parser('ai', help='Generate using AI')
    parser_ai.add_argument('prompt', nargs='?', help='Natural language prompt')
    parser_ai.add_argument('-p', '--provider', default='openai', help='AI Provider')
    parser_ai.add_argument('-m', '--model', help='Specific model name')
    parser_ai.add_argument('-d', '--domain', help='Target domain context')
    parser_ai.add_argument('--list-providers', action='store_true', help='List supported providers')

    # Builder
    subparsers.add_parser('builder', help='Interactive Visual Builder')

    # Validate (Made query optional to show help)
    parser_val = subparsers.add_parser('validate', help='Validate a dork')
    parser_val.add_argument('query', nargs='?', help='Dork query')

    # Permute (Made query optional to show help)
    parser_perm = subparsers.add_parser('permute', help='Generate variations')
    parser_perm.add_argument('query', nargs='?', help='Base dork')

    # Smart Argument Inference (DWIM)
    # Check if user forgot the subcommand but provided flags
    if len(sys.argv) > 1 and sys.argv[1] not in ['generate', 'ai', 'builder', 'validate', 'permute', '-h', '--help']:
         # If first arg looks like a flag (-c, --category), inject 'generate'
         if '-c' in sys.argv or '--category' in sys.argv:
             rprint("[yellow]ℹ️  Implicitly using 'generate' command based on arguments.[/yellow]")
             sys.argv.insert(1, 'generate')
         
         # If first arg looks like provider flag (-p), inject 'ai'
         elif '-p' in sys.argv or '--provider' in sys.argv:
              rprint("[yellow]ℹ️  Implicitly using 'ai' command based on arguments.[/yellow]")
              sys.argv.insert(1, 'ai')

    args = parser.parse_args()
    cli = DorkForgeCLI()

    if not args.command:
        cli.print_banner()
        # Show a friendly welcome instead of raw help
        rprint("\n[bold]Welcome to DorkForge![/bold]")
        rprint("Please specify a command or run [cyan]builder[/cyan] for the interactive wizard.\n")
        
        table = Table(show_header=False, box=None)
        table.add_row("[green]generate[/green]", "Use pre-made templates (e.g. login pages, admin panels)")
        table.add_row("[green]ai[/green]", "Ask AI to write dorks for you")
        table.add_row("[green]builder[/green]", "Interactive step-by-step wizard (Recommended)")
        table.add_row("[green]validate[/green]", "Check syntax of a dork")
        console.print(table)
        
        rprint("\n[dim]Run 'python3 cli.py <command>' to start.[/dim]")
        return

    try:
        if args.command == 'generate':
            cli.handle_generate(args)
        elif args.command == 'ai':
            cli.handle_ai(args)
        elif args.command == 'builder':
            cli.handle_builder(args)
        elif args.command == 'validate':
            cli.handle_validate(args)
        elif args.command == 'permute':
            cli.handle_permute(args)

    except KeyboardInterrupt:
        rprint("\n[yellow]Operation cancelled by user.[/yellow]")
        sys.exit(0)

if __name__ == '__main__':
    main()
